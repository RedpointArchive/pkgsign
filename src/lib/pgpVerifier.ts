import { Verifier } from "./verifier";
import fetch from "node-fetch";
import * as openpgp from 'openpgp';
import { ITrustStore } from "./trustStore";
import * as crypto from 'crypto';
import { SignatureIdentity } from "./signature/signatureIdentity";

export class PgpVerifier implements Verifier {
    constructor(private trustStore: ITrustStore) {
    }

    public async verify(identity: SignatureIdentity, signature: string, deterministicString: string) {
        if (!identity.pgpPublicKeyUrl.startsWith('https://')) {
            // public key URLs must be HTTPS.
            return false;
        }

        let didFetch = false;
        const fetchPub = async () => {
            console.log('fetching public keys at URL ' + identity.pgpPublicKeyUrl + '...');
            didFetch = true;
            return await (await fetch(identity.pgpPublicKeyUrl)).text();
        };

        const attemptVerify = async (rawPublicKeys: string) => {
            try {
                const publicKeys = openpgp.key.readArmored(rawPublicKeys).keys;
                const verifyOptions = {
                    message: openpgp.message.fromText(deterministicString),
                    signature: openpgp.signature.readArmored(signature),
                    publicKeys: publicKeys
                };
                const verifiedMessage = await openpgp.verify(verifyOptions);
                return verifiedMessage.signatures.length >= 1;
            } catch (e) {
                return false;
            }
        }

        let urlHashObj = crypto.createHash('sha512');
        urlHashObj.update(identity.pgpPublicKeyUrl);
        let urlHash = urlHashObj.digest('hex');

        let rawPublicKeys = await this.trustStore.getOrFetchCachedPublicKeys('pgp.https.' + urlHash, fetchPub);
        let firstTry = await attemptVerify(rawPublicKeys);
        if (didFetch || firstTry) {
            return firstTry;
        } else {
            // user might have updated their PGP public keys with a new signature, refetch.
            rawPublicKeys = await this.trustStore.fetchCachedPublicKeys('pgp.https.' + urlHash, fetchPub);
            return await attemptVerify(rawPublicKeys);
        }
    }
}