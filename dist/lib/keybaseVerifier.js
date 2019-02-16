"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const openpgp = require("openpgp");
const node_fetch_1 = require("node-fetch");
class KeybaseVerifier {
    constructor(trustStore) {
        this.trustStore = trustStore;
    }
    verify(identity, signature, deterministicString) {
        return __awaiter(this, void 0, void 0, function* () {
            let didFetch = false;
            const fetchPub = () => __awaiter(this, void 0, void 0, function* () {
                console.log('fetching public keys of user ' + identity.keybaseUser + '...');
                didFetch = true;
                return yield (yield node_fetch_1.default('https://keybase.io/' + identity.keybaseUser + '/pgp_keys.asc')).text();
            });
            const attemptVerify = (rawPublicKeys) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const publicKeys = (yield openpgp.key.readArmored(rawPublicKeys)).keys;
                    const verifyOptions = {
                        message: openpgp.message.fromText(deterministicString),
                        signature: yield openpgp.signature.readArmored(signature),
                        publicKeys: publicKeys
                    };
                    const verifiedMessage = yield openpgp.verify(verifyOptions);
                    return verifiedMessage.signatures.some((signature) => signature.valid);
                }
                catch (e) {
                    return false;
                }
            });
            let rawPublicKeys = yield this.trustStore.getOrFetchCachedPublicKeys('keybase.io.' + identity.keybaseUser, fetchPub);
            let firstTry = yield attemptVerify(rawPublicKeys);
            if (didFetch || firstTry) {
                return firstTry;
            }
            else {
                // user might have updated their PGP public keys with a new signature, refetch.
                rawPublicKeys = yield this.trustStore.fetchCachedPublicKeys('keybase.io.' + identity.keybaseUser, fetchPub);
                return yield attemptVerify(rawPublicKeys);
            }
        });
    }
}
exports.KeybaseVerifier = KeybaseVerifier;
//# sourceMappingURL=keybaseVerifier.js.map