import { SignatureIdentity } from "./deterministicSignature";
import * as openpgp from 'openpgp';
import { Verifier } from "./verifier";
import fetch from "node-fetch";

export class KeybaseVerifier implements Verifier {
    public async verify(identity: SignatureIdentity, signature: string, deterministicSignature: string) {
        console.log('fetching public keys of user ' + identity.keybaseUser + '...');
        const rawPublicKeys = await (await fetch('https://keybase.io/' + identity.keybaseUser + '/pgp_keys.asc')).text();
        const publicKeys = openpgp.key.readArmored(rawPublicKeys).keys;

        const verifyOptions = {
            message: openpgp.message.fromText(deterministicSignature),
            signature: openpgp.signature.readArmored(signature),
            publicKeys: publicKeys
        };

        const verifiedMessage = await openpgp.verify(verifyOptions);

        return verifiedMessage.signatures.length >= 1;
    }
}