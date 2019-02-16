import * as openpgp from 'openpgp';
import { Verifier } from "./verifier";
import fetch from "node-fetch";
import { ITrustStore } from "./trustStore";
import { SignatureIdentity } from './signature/signatureIdentity';

export class KeybaseVerifier implements Verifier {
    constructor(private trustStore: ITrustStore) {
    }

    public async verify(identity: SignatureIdentity, signature: string, deterministicString: string) {
        let didFetch = false;
        const user = encodeURIComponent(identity.keybaseUser).substr(0, 128);
        const fetchPub = async () => {
            console.log(`fetching public keys of user ${user}...`);
            didFetch = true;
            return await (await fetch(`https://keybase.io/${user}/pgp_keys.asc`)).text();
        };

        const attemptVerify = async (rawPublicKeys: string) => {
            try {
                const publicKeys = (await openpgp.key.readArmored(rawPublicKeys)).keys;
                const verifyOptions = {
                    message: openpgp.message.fromText(deterministicString),
                    signature: await openpgp.signature.readArmored(signature),
                    publicKeys: publicKeys
                };
                const verifiedMessage = await openpgp.verify(verifyOptions);
                return verifiedMessage.signatures.some((signature) => signature.valid);
            } catch (e) {
                return false;
            }
        }

        let rawPublicKeys = await this.trustStore.getOrFetchCachedPublicKeys(`keybase.io.${user}`, fetchPub);
        let firstTry = await attemptVerify(rawPublicKeys);
        if (didFetch || firstTry) {
            return firstTry;
        } else {
            // user might have updated their PGP public keys with a new signature, refetch.
            rawPublicKeys = await this.trustStore.fetchCachedPublicKeys(`keybase.io.${user}`, fetchPub);
            return await attemptVerify(rawPublicKeys);
        }
    }
}