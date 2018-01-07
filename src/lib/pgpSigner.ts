import { Signer } from "./signer";
import { SignatureIdentity } from "./deterministicSignature";
import { readFilePromise } from "./fsPromise";
import * as openpgp from 'openpgp';

export class PgpSigner implements Signer {
    constructor(
        private privateKeyPath: string,
        private privateKeyPassphrase: string,
        private publicKeyHttpsUrl: string) {
    }

    public async getIdentity(): Promise<SignatureIdentity> {
        return {
            pgpPublicKeyUrl: this.publicKeyHttpsUrl
        };
    }

    public async signEntries(deterministicSignature: string): Promise<string> {
        console.log('signing with private pgp key...');
        const privateKeyFileContents = await readFilePromise(this.privateKeyPath);
        const privateKeyObject = openpgp.key.readArmored(privateKeyFileContents).keys[0];
        privateKeyObject.decrypt(this.privateKeyPassphrase);
        const options = {
            data: deterministicSignature,
            privateKeys: privateKeyObject,
            detached: true,
        };
        const signedResult = await openpgp.sign(options);
        return signedResult.signature;
    }
}