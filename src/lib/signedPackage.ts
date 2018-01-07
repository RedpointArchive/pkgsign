import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import * as openpgp from 'openpgp';
import { SignatureFileEntry, createSignatureFromEntries } from './deterministicSignature';

export interface VerificationResults {
    unsigned: VerificationResult[];
    untrusted: VerificationResult[];
    trusted: VerificationResult[];
}

export interface SignatureInfo {
    version: string;
    files: SignatureFileEntry[];
    signature: string;
    identity: {
        keybaseUser: string;
    }
}

export interface ModuleInfo {
    package: any;
    path: string;
}

export interface VerificationResult extends ModuleInfo {
    reason: string;
}

export class SignedPackage {
    constructor(private dir: string) { }

    public async verify(): Promise<VerificationResults> {
        // build up a list of node modules we need to verify, based on the current directory
        const modules = await this.findModules(this.dir);
        modules.push({
            package: JSON.parse(await this.readFilePromise(path.join(this.dir, 'package.json'))),
            path: this.dir,
        });

        let results = {
            unsigned: [],
            untrusted: [],
            trusted: [],
        };

        for (let moduleInfo of modules) {
            let signature: SignatureInfo | null = null;
            try {
                signature = JSON.parse(await this.readFilePromise(path.join(moduleInfo.path, 'signature.json'))) as SignatureInfo;
            } catch (e) {
                results.unsigned.push({
                    ...moduleInfo,
                    reason: 'Missing or unparsable signature.json',
                });
                continue;
            }

            if (signature.version != 'v1') {
                // We don't recognise this.
                results.unsigned.push({
                    ...moduleInfo,
                    reason: 'Unrecognised signature version ' + signature.version,
                });
                continue;
            }

            // Build up our deterministic string to validate the signature against.
            const deterministicSignatureString = createSignatureFromEntries(signature.files);

            // Fetch the keybase.io user PGP public keys.
            console.log('fetching public keys of user ' + signature.identity.keybaseUser + '...');
            const rawPublicKeys = await (await fetch('https://keybase.io/' + signature.identity.keybaseUser + '/pgp_keys.asc')).text();
            console.log(rawPublicKeys);
            const publicKeys = openpgp.key.readArmored(rawPublicKeys).keys;
            console.log(publicKeys);

            const verifiedMessage = await openpgp.verifyClearSignedMessage(publicKeys, openpgp.signature.readArmored(deterministicSignatureString));

            console.log(verifiedMessage);
        }

        return results;
    }

    private async findModules(dir: string): Promise<ModuleInfo[]> {
        let resultModules: ModuleInfo[] = [];
        let ourModules: string[] = [];
        try {
            ourModules = await this.readdirPromise(path.join(dir, 'node_modules'));
        } catch (e) {
            if (e && e.code == 'ENOENT') {
                // this package has no child modules.
            } else {
                throw e;
            }
        }
        for (let otherModule of ourModules) {
            if (otherModule[0] == '@') {
                // this is a namespace folder, iterate through it instead.
                const nsModules = await this.readdirPromise(path.join(dir, 'node_modules', otherModule));
                for (let nsModule of nsModules) {
                    const theirModules = await this.findModules(path.join(dir, 'node_modules', otherModule, nsModule));
                    resultModules.push(...theirModules);
                }
            } else {
                const theirModules = await this.findModules(path.join(dir, 'node_modules', otherModule));
                resultModules.push(...theirModules);
            }

            if (otherModule[0] != '.' && otherModule[0] != '@') {
                resultModules.push({
                    package: JSON.parse(await this.readFilePromise(path.join(dir, 'node_modules', otherModule, 'package.json'))),
                    path: path.join(dir, 'node_modules', otherModule),
                });
            }
        }
        return resultModules;
    }

    private readdirPromise(dir: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            fs.readdir(dir, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }

    private readFilePromise(file: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(file, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
}