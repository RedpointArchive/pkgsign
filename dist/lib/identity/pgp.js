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
const fsPromise_1 = require("../util/fsPromise");
const openpgp = require("openpgp");
const node_fetch_1 = require("node-fetch");
const crypto = require("crypto");
exports.PgpIdentityProvider = {
    getIdentity: (context) => __awaiter(this, void 0, void 0, function* () {
        return {
            pgpPublicKeyUrl: context.publicKeyHttpsUrl
        };
    }),
    signEntries: (context, deterministicString) => __awaiter(this, void 0, void 0, function* () {
        console.log("signing with private pgp key...");
        const privateKeyFileContents = yield fsPromise_1.readFilePromise(context.privateKeyPath);
        const privateKey = yield openpgp.key.readArmored(privateKeyFileContents);
        const privateKeyObject = privateKey.keys[0];
        try {
            yield privateKeyObject.decrypt(context.privateKeyPassphrase);
        }
        catch (err) {
            if (err.message === "Key packet is already decrypted.") {
                // allow
            }
            else {
                throw err;
            }
        }
        const text = new openpgp.cleartext.CleartextMessage(deterministicString, null /* function typedef is wrong here */);
        const options = {
            message: text,
            privateKeys: privateKeyObject,
            detached: true
        };
        const signedResult = yield openpgp.sign(options);
        return signedResult.signature.replace(/\r\n/g, "\n");
    }),
    verify: (context, identity, signature, deterministicString) => __awaiter(this, void 0, void 0, function* () {
        if (identity.pgpPublicKeyUrl === undefined) {
            return false;
        }
        const pgpPublicKeyUrl = identity.pgpPublicKeyUrl;
        if (!pgpPublicKeyUrl.startsWith("https://")) {
            // public key URLs must be HTTPS.
            return false;
        }
        let didFetch = false;
        const fetchPub = () => __awaiter(this, void 0, void 0, function* () {
            console.log("fetching public keys at URL " + pgpPublicKeyUrl + "...");
            didFetch = true;
            return yield (yield node_fetch_1.default(pgpPublicKeyUrl)).text();
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
                return verifiedMessage.signatures.length >= 1;
            }
            catch (e) {
                return false;
            }
        });
        let urlHashObj = crypto.createHash("sha512");
        urlHashObj.update(pgpPublicKeyUrl);
        let urlHash = urlHashObj.digest("hex");
        let rawPublicKeys = yield context.trustStore.getOrFetchCachedPublicKeys("pgp.https." + urlHash, fetchPub);
        let firstTry = yield attemptVerify(rawPublicKeys);
        if (didFetch || firstTry) {
            return firstTry;
        }
        else {
            // user might have updated their PGP public keys with a new signature, refetch.
            rawPublicKeys = yield context.trustStore.fetchCachedPublicKeys("pgp.https." + urlHash, fetchPub);
            return yield attemptVerify(rawPublicKeys);
        }
    })
};
//# sourceMappingURL=pgp.js.map