import { SignatureIdentity } from "./deterministicSignature";
import * as openpgp from 'openpgp';
import { Verifier } from "./verifier";
import fetch from "node-fetch";
import { TrustStore } from "./trustStore";

export class KeybaseVerifier implements Verifier {
    constructor(private trustStore: TrustStore) {
        
    }

    public async verify(identity: SignatureIdentity, signature: string, deterministicSignature: string) {
        let didFetch = false;
        const fetchPub = async () => {
            console.log('fetching public keys of user ' + identity.keybaseUser + '...');
            didFetch = true;
            return await (await fetch('https://keybase.io/' + identity.keybaseUser + '/pgp_keys.asc')).text();
        };

        const attemptVerify = async (rawPublicKeys: string) => {
            try {
                const publicKeys = openpgp.key.readArmored(rawPublicKeys).keys;
                const verifyOptions = {
                    message: openpgp.message.fromText(deterministicSignature),
                    signature: openpgp.signature.readArmored(signature),
                    publicKeys: publicKeys
                };
                const verifiedMessage = await openpgp.verify(verifyOptions);
                return verifiedMessage.signatures.length >= 1;
            } catch (e) {
                return false;
            }
        }

        let rawPublicKeys = await this.trustStore.getOrFetchCachedPublicKeys('keybase.io.' + identity.keybaseUser, fetchPub);
        let firstTry = await attemptVerify(rawPublicKeys);
        if (didFetch) {
            return firstTry;
        } else {
            // user might have updated their PGP public keys with a new signature, refetch.
            rawPublicKeys = await this.trustStore.fetchCachedPublicKeys('keybase.io.' + identity.keybaseUser, fetchPub);
            return await attemptVerify(rawPublicKeys);
        }
    }
}