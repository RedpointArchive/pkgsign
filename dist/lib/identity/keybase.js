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
const cmd = require("node-cmd");
const strip_ansi_1 = require("strip-ansi");
const fsPromise_1 = require("../util/fsPromise");
const path_1 = require("path");
const openpgp = require("openpgp");
const node_fetch_1 = require("node-fetch");
exports.KeybaseIdentityProvider = {
    getIdentity: (context) => __awaiter(this, void 0, void 0, function* () {
        const keybaseIdentity = yield new Promise((resolve, reject) => {
            cmd.get("keybase id", (err, data, stderr) => {
                if (err) {
                    reject(err);
                }
                else {
                    const result = /Identifying (.+)/g.exec(data + stderr);
                    if (result === null || result[1] === undefined) {
                        reject(new Error("keybase didn't return your username for 'keybase id'"));
                    }
                    else {
                        resolve(result[1]);
                    }
                }
            });
        });
        let stripAnsiFn = yield strip_ansi_1.default;
        return {
            keybaseUser: stripAnsiFn(keybaseIdentity)
        };
    }),
    signEntries: (context, deterministicString) => __awaiter(this, void 0, void 0, function* () {
        console.log("requesting keybase pgp sign deterministic signature...");
        console.log("(you may receive an interactive prompt from keybase)");
        const wd = yield fsPromise_1.createWorkingDirectory();
        const fileToSignPath = path_1.join(wd, "signature.sig");
        yield fsPromise_1.writeFilePromise(fileToSignPath, deterministicString);
        const keybaseSignature = yield new Promise((resolve, reject) => {
            cmd.get('keybase pgp sign --detached -i "' + fileToSignPath + '"', (err, data, stderr) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
        yield fsPromise_1.unlinkPromise(fileToSignPath);
        return keybaseSignature;
    }),
    verify: (context, identity, signature, deterministicString) => __awaiter(this, void 0, void 0, function* () {
        if (identity.keybaseUser === undefined) {
            return false;
        }
        let didFetch = false;
        const fetchPub = () => __awaiter(this, void 0, void 0, function* () {
            console.log("fetching public keys of user " + identity.keybaseUser + "...");
            didFetch = true;
            return yield (yield node_fetch_1.default("https://keybase.io/" + identity.keybaseUser + "/pgp_keys.asc")).text();
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
        let rawPublicKeys = yield context.trustStore.getOrFetchCachedPublicKeys("keybase.io." + identity.keybaseUser, fetchPub);
        let firstTry = yield attemptVerify(rawPublicKeys);
        if (didFetch || firstTry) {
            return firstTry;
        }
        else {
            // user might have updated their PGP public keys with a new signature, refetch.
            rawPublicKeys = yield context.trustStore.fetchCachedPublicKeys("keybase.io." + identity.keybaseUser, fetchPub);
            return yield attemptVerify(rawPublicKeys);
        }
    })
};
//# sourceMappingURL=keybase.js.map