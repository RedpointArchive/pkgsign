import * as cmd from 'node-cmd';
import { Signer } from "./signer";
import { SignatureIdentity } from "./deterministicSignature";
import { join } from 'path';
import { writeFilePromise, createWorkingDirectory, unlinkPromise } from './fsPromise';

export class KeybaseSigner implements Signer {
    public async getIdentity(): Promise<SignatureIdentity> {
        console.log('determining your keybase username...');
        const keybaseIdentity = await new Promise<string>((resolve, reject) => {
            cmd.get(
                'keybase id',
                (err, data, stderr) => {
                    if (err) {
                        reject(err);
                    } else {
                        const result = /Identifying (.+)/g.exec(data + stderr);
                        if (result[1] === undefined) {
                            reject(new Error('keybase didn\'t return your username for \'keybase id\''));
                        } else {
                            resolve(result[1]);
                        }
                    }
                }
            )
        });
        return {
            keybaseUser: keybaseIdentity,
        };
    }

    public async signEntries(deterministicSignature: string): Promise<string> {
        console.log('requesting keybase pgp sign deterministic signature...');
        console.log('(you may receive an interactive prompt from keybase)');
        const wd = await createWorkingDirectory();
        const fileToSignPath = join(wd, 'signature.sig');
        await writeFilePromise(fileToSignPath, deterministicSignature);
        const keybaseSignature = await new Promise<string>((resolve, reject) => {
            cmd.get(
                'keybase pgp sign --detached -i "' + fileToSignPath + '"',
                (err, data, stderr) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                }
            )
        });
        await unlinkPromise(fileToSignPath);
        return keybaseSignature;
    }
}