import {
    Command,
    command,
    param,
    Options,
    option,
} from 'clime';
import * as cmd from 'node-cmd';
import * as path from 'path';
import { lstatSync, unlinkSync } from 'fs';
import { unlinkPromise, recursivePromise, sha512OfFile, writeFilePromise, createWorkingDirectory, decompress, compress, readFilePromise } from '../lib/fsPromise';
import { Signer } from '../lib/signer';
import { KeybaseSigner } from '../lib/keybaseSigner';
import { PgpSigner } from '../lib/pgpSigner';
import * as packlist from 'npm-packlist';
import { SignatureFileEntry, SignatureFilesEntry } from '../lib/signature/signatureFilesEntry';
import { SignatureInfo, createDeterministicString } from '../lib/signature';
import { SignatureIdentityEntry } from '../lib/signature/signatureIdentityEntry';
import { queueTelemetry } from '../lib/telemetry';
import { identityToString } from '../lib/signature/signatureIdentity';
  
export class SignOptions extends Options {
    @option({
        name: 'signer',
        description: 'the signer to use, one of: \'keybase\' (default) or \'pgp\'',
        default: 'keybase',
    })
    withSigner: string;
    @option({
        name: 'pgp-private-key-path',
        description: 'when signing with \'pgp\', this is the path to the private key file',
    })
    privateKeyPath: string;
    @option({
        name: 'pgp-private-key-passphrase',
        description: 'when signing with \'pgp\', this is the passphrase for the private key file',
    })
    privateKeyPassphrase: string;
    @option({
        name: 'pgp-public-key-https-url',
        description: 'when signing with \'pgp\', this is the HTTPS URL to the public key that pkgsign can download to verify the package',
    })
    publicKeyUrl: string;
}

@command({
    description: 'sign an npm/yarn package directory or tarball',
})
export default class extends Command {
    public async execute(
        @param({
            name: 'pkgdir|tarball',
            description: 'path to package directory or tarball',
            required: true,
        })
        path: string,
        options: SignOptions
    ) {
        let signer: Signer;
        if (options.withSigner == 'pgp') {
            signer = new PgpSigner(
                options.privateKeyPath,
                options.privateKeyPassphrase,
                options.publicKeyUrl);
        } else if (options.withSigner == 'keybase') {
            signer = new KeybaseSigner();
        } else {
            throw new Error('Not supported signer type: ' + options.withSigner);
        }

        if (path.endsWith(".tgz") && lstatSync(path).isFile()) {
            await this.signTarball(signer, path);
        } else {
            await this.signDirectory(signer, path);
        }
    }

    private async signTarball(signer: Signer, tarballPath: string): Promise<void> {
        // We never record package names for tarballs, since we don't load package.json
        // and thus don't know if the private flag is set. We never send identifiable telemetry
        // on private packages.
        await queueTelemetry({
            action: 'sign-tarball',
            packageName: '',
            packageVersion: '',
            packageIsSigned: true,
            signingIdentity: '',
            identityIsTrusted: true,
        });

        const wd = await createWorkingDirectory();
        console.log('extracting unsigned tarball...');
        await decompress(tarballPath, wd);

        console.log('building file list...');
        const base = path.join(wd, "package");
        const files = await recursivePromise(base);
        let entries: SignatureFileEntry[] = [];
        for (let fullPath of files) {
            const hash = await sha512OfFile(fullPath);
            const normalisedPath = fullPath.substr(base.length + 1).replace(/\\/g, '/');
            if (normalisedPath == 'signature.json') {
                // This file might be included in the Git repo to sign the contents of the
                // latest commit against Keybase or PGP, but it should never be included
                // in the signature (because we're about to replace it in the signed package
                // anyway).
                continue;
            }
            entries.push({
                path: normalisedPath,
                sha512: hash,
            });
        }

        console.log('obtaining identity...');
        const identity = await signer.getIdentity();

        console.log('creating signature...');
        const signatureDocument: SignatureInfo = {
            entries: [
                new SignatureFilesEntry({
                    files: entries,
                }),
                new SignatureIdentityEntry({
                    identity: identity,
                })
            ],
            signature: '',
        };

        console.log('creating deterministic string...');
        const deterministicString = createDeterministicString(signatureDocument);

        console.log('signing deterministic string...');
        signatureDocument.signature = await signer.signEntries(deterministicString);

        const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
        await writeFilePromise(path.join(wd, 'package', 'signature.json'), signatureDocumentJson);

        await unlinkPromise(tarballPath);
        await compress(wd, tarballPath);

        console.log('package tarball has been signed');
    }

    private async signDirectory(signer: Signer, packagePath: string): Promise<void> {
        console.log('building file list...');
        const files = await packlist({
            path: packagePath
        });
        let entries: SignatureFileEntry[] = [];
        let packageInfo: any = null;
        for (let relPath of files) {
            const hash = await sha512OfFile(path.join(packagePath, relPath));
            const normalisedPath = relPath.replace(/\\/g, '/');
            if (normalisedPath == 'signature.json') {
                // This file might be included in the Git repo to sign the contents of the
                // latest commit against Keybase or PGP, but it should never be included
                // in the signature (because we're about to replace it in the signed package
                // anyway).
                continue;
            }
            if (normalisedPath == 'package.json') {
                const packageJson = await readFilePromise(path.join(packagePath, relPath));
                packageInfo = JSON.parse(packageJson);
            }
            entries.push({
                path: normalisedPath,
                sha512: hash,
            });
        }

        console.log('obtaining identity...');
        const identity = await signer.getIdentity();

        if (packageInfo != null && packageInfo.name != undefined) {
            if (packageInfo.private != true) {
                // This is not a private package, so record telemetry with the package
                // name included.
                await queueTelemetry({
                    action: 'sign-directory',
                    packageName: packageInfo.name,
                    packageVersion: packageInfo.version || '',
                    packageIsSigned: true,
                    signingIdentity: identityToString(identity),
                    identityIsTrusted: true,
                });
            } else {
                // Private package, don't include any package information.
                await queueTelemetry({
                    action: 'sign-directory',
                    packageName: '',
                    packageVersion: '',
                    packageIsSigned: true,
                    signingIdentity: '',
                    identityIsTrusted: true,
                });
            }
        } else {
            // Can't read package.json or it doesn't exist - don't include
            // any package information.
            await queueTelemetry({
                action: 'sign-directory',
                packageName: '',
                packageVersion: '',
                packageIsSigned: true,
                signingIdentity: '',
                identityIsTrusted: true,
            });
        }

        console.log('creating signature...');
        const signatureDocument: SignatureInfo = {
            entries: [
                new SignatureFilesEntry({
                    files: entries,
                }),
                new SignatureIdentityEntry({
                    identity: identity,
                })
            ],
            signature: '',
        };

        console.log('creating deterministic string...');
        const deterministicString = createDeterministicString(signatureDocument);

        console.log('signing deterministic string...');
        signatureDocument.signature = await signer.signEntries(deterministicString);

        const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
        await writeFilePromise(path.join(packagePath, 'signature.json'), signatureDocumentJson);

        console.log('signature.json has been created in package directory');
    }
}