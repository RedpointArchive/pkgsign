import * as cmd from 'node-cmd';
import { Signer } from "./signer";
import { join } from 'path';
import { writeFilePromise, createWorkingDirectory, unlinkPromise } from './fsPromise';
import { SignatureIdentity } from './signature/signatureIdentity';
const stripAnsi = import('strip-ansi');

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
        let stripAnsiFn = await stripAnsi;
        return {
            keybaseUser: stripAnsiFn(keybaseIdentity),
        };
    }

    public async signEntries(deterministicString: string): Promise<string> {
        console.log('requesting keybase pgp sign deterministic signature...');
        console.log('(you may receive an interactive prompt from keybase)');
        const wd = await createWorkingDirectory();
        const fileToSignPath = join(wd, 'signature.sig');
        await writeFilePromise(fileToSignPath, deterministicString);
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