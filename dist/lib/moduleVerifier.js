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
const signature_1 = require("./signature");
const fsPromise_1 = require("./fsPromise");
const path = require("path");
const keybaseVerifier_1 = require("./keybaseVerifier");
const pgpVerifier_1 = require("./pgpVerifier");
var ModuleVerificationStatus;
(function (ModuleVerificationStatus) {
    // When the data on disk or in the package explicitly does not
    // match the expected state of the signature (either extra files,
    // missing files, mismatched hashes or signature doesn't verify).
    ModuleVerificationStatus[ModuleVerificationStatus["Compromised"] = 0] = "Compromised";
    // When the package doesn't have a signature or it can't be loaded.
    ModuleVerificationStatus[ModuleVerificationStatus["Unsigned"] = 1] = "Unsigned";
    // When the package has a valid signature, but the user or device 
    // doesn't trust the associated identity.
    ModuleVerificationStatus[ModuleVerificationStatus["Untrusted"] = 2] = "Untrusted";
    // When the package has a valid signature and the user or device
    // trusts the associated identity.
    ModuleVerificationStatus[ModuleVerificationStatus["Trusted"] = 3] = "Trusted";
})(ModuleVerificationStatus = exports.ModuleVerificationStatus || (exports.ModuleVerificationStatus = {}));
class ModuleVerifier {
    constructor(trustStore) {
        this.trustStore = trustStore;
    }
    verify(dir, relFilesOnDisk, expectedPackageName) {
        return __awaiter(this, void 0, void 0, function* () {
            // Load the signature document.
            let signature = null;
            try {
                let rawJson = yield fsPromise_1.readFilePromise(path.join(dir, 'signature.json'));
                let signatureParser = new signature_1.SignatureParser();
                signature = signatureParser.parse(rawJson);
            }
            catch (e) {
                return {
                    status: ModuleVerificationStatus.Unsigned,
                    reason: 'Missing or unparsable signature.json',
                    packageName: expectedPackageName,
                };
            }
            // Build up our deterministic string to validate the signature against.
            const deterministicString = signature_1.createDeterministicString(signature);
            // Verify each of the entries.
            let context = {
                dir: dir,
                relFilesOnDisk: relFilesOnDisk,
                expectedPackageName: expectedPackageName,
            };
            for (let entry of signature.entries) {
                let entryResult = yield entry.verify(context);
                if (entryResult !== null) {
                    return entryResult;
                }
            }
            // Find an entry that provides an identity.
            let identity = null;
            for (let entry of signature.entries) {
                let localIdentity = entry.getIdentity();
                if (localIdentity !== null) {
                    identity = localIdentity;
                    break;
                }
            }
            if (identity === null) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'No identity information in signature.json',
                    packageName: expectedPackageName,
                };
            }
            // Now we know the package contents matches the files expected by the signature, and all
            // of the hashes match, but now we need to locate the public keys for the signature so
            // we can verify it.
            let verifier;
            if (identity.keybaseUser !== undefined) {
                verifier = new keybaseVerifier_1.KeybaseVerifier(this.trustStore);
            }
            else if (identity.pgpPublicKeyUrl !== undefined) {
                verifier = new pgpVerifier_1.PgpVerifier(this.trustStore);
            }
            else {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'Unknown identity in signature.json',
                    packageName: expectedPackageName,
                };
            }
            // Request the verifier verify the signature.
            if (!(yield verifier.verify(identity, signature.signature, deterministicString))) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'The signature does not match',
                    packageName: expectedPackageName,
                };
            }
            // Check the package name in package.json matches the expected
            // package name that was provided.
            let packageInfo = null;
            try {
                packageInfo = JSON.parse(yield fsPromise_1.readFilePromise(path.join(dir, 'package.json')));
            }
            catch (e) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'Missing or unparsable package.json',
                    packageName: expectedPackageName,
                };
            }
            if (packageInfo == null || packageInfo.name != expectedPackageName) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'Provided package name in package.json did not match expected package name',
                    packageName: expectedPackageName,
                };
            }
            // Package signature is valid, now we need to see if the identity
            // is trusted for the given package name.
            if (yield this.trustStore.isTrusted(identity, expectedPackageName)) {
                return {
                    status: ModuleVerificationStatus.Trusted,
                    packageName: expectedPackageName,
                };
            }
            else {
                return {
                    status: ModuleVerificationStatus.Untrusted,
                    untrustedIdentity: identity,
                    packageName: expectedPackageName,
                };
            }
        });
    }
}
exports.ModuleVerifier = ModuleVerifier;
//# sourceMappingURL=moduleVerifier.js.map