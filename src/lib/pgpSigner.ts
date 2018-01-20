import { Signer } from "./signer";
import { readFilePromise } from "./fsPromise";
import * as openpgp from 'openpgp';
import { SignatureIdentity } from "./signature/signatureIdentity";

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

    public async signEntries(deterministicString: string): Promise<string> {
        console.log('signing with private pgp key...');
        const privateKeyFileContents = await readFilePromise(this.privateKeyPath);
        const privateKeyObject = openpgp.key.readArmored(privateKeyFileContents).keys[0];
        privateKeyObject.decrypt(this.privateKeyPassphrase);
        const options = {
            data: deterministicString,
            privateKeys: privateKeyObject,
            detached: true,
        };
        const signedResult = await openpgp.sign(options);
        return signedResult.signature.replace(/\r\n/g, "\n");
    }
}