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
const node_fetch_1 = require("node-fetch");
const openpgp = require("openpgp");
const crypto = require("crypto");
class PgpVerifier {
    constructor(trustStore) {
        this.trustStore = trustStore;
    }
    verify(identity, signature, deterministicString) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!identity.pgpPublicKeyUrl.startsWith("https://")) {
                // public key URLs must be HTTPS.
                return false;
            }
            let didFetch = false;
            const fetchPub = () => __awaiter(this, void 0, void 0, function* () {
                console.log("fetching public keys at URL " + identity.pgpPublicKeyUrl + "...");
                didFetch = true;
                return yield (yield node_fetch_1.default(identity.pgpPublicKeyUrl)).text();
            });
            const attemptVerify = (rawPublicKeys) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const publicKeys = (yield openpgp.key.readArmored(rawPublicKeys)).keys;
                    const verifyOptions = {
                        message: openpgp.message.fromText(deterministicString),
                        signature: openpgp.signature.readArmored(signature),
                        publicKeys: publicKeys
                    };
                    const verifiedMessage = yield openpgp.verify(verifyOptions);
                    return verifiedMessage.signatures.length >= 1;
                }
                catch (e) {
                    return false;
                }
            });
            let urlHashObj = crypto.createHash("sha512");
            urlHashObj.update(identity.pgpPublicKeyUrl);
            let urlHash = urlHashObj.digest("hex");
            let rawPublicKeys = yield this.trustStore.getOrFetchCachedPublicKeys("pgp.https." + urlHash, fetchPub);
            let firstTry = yield attemptVerify(rawPublicKeys);
            if (didFetch || firstTry) {
                return firstTry;
            }
            else {
                // user might have updated their PGP public keys with a new signature, refetch.
                rawPublicKeys = yield this.trustStore.fetchCachedPublicKeys("pgp.https." + urlHash, fetchPub);
                return yield attemptVerify(rawPublicKeys);
            }
        });
    }
}
exports.PgpVerifier = PgpVerifier;
//# sourceMappingURL=pgpVerifier.js.map