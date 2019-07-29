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
const path = require("path");
const types_1 = require("./types");
const fsPromise_1 = require("./util/fsPromise");
const signature_1 = require("./signature");
const registry_1 = require("./entryHandlers/registry");
const keybase_1 = require("./identity/keybase");
const pgp_1 = require("./identity/pgp");
class ModuleVerifier {
    constructor(trustStore) {
        this.trustStore = trustStore;
    }
    verify(dir, relFilesOnDisk, expectedPackageName) {
        return __awaiter(this, void 0, void 0, function* () {
            // Try to read whether or not the module is private early so we
            // can return the information to the caller. This field is untrusted, and
            // is only used by telemetry when determining the amount of data to send.
            let isPrivate = true;
            let untrustedPackageVersion = "";
            let earlyPackageInfo;
            try {
                earlyPackageInfo = JSON.parse(yield fsPromise_1.readFilePromise(path.join(dir, "package.json")));
                isPrivate = earlyPackageInfo.private || false;
                untrustedPackageVersion = earlyPackageInfo.version || "";
            }
            catch (e) { }
            // Load the signature document.
            let signature;
            try {
                const rawJson = yield fsPromise_1.readFilePromise(path.join(dir, "signature.json"));
                signature = yield signature_1.readUnverifiedSignatureDocument(rawJson);
            }
            catch (e) {
                return {
                    status: types_1.ModuleVerificationStatus.Unsigned,
                    reason: "Missing or unparsable signature.json",
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate
                };
            }
            // If the document has any entries that we don't recognise, we can't
            // validate the document.
            for (const entry of signature.entries) {
                const hasHandler = registry_1.availableEntryHandlersByName.has(entry.entry);
                if (!hasHandler) {
                    return {
                        status: types_1.ModuleVerificationStatus.Compromised,
                        reason: `Unrecognised entry in signature.json: '${entry.entry}' (try upgrading pkgsign)`,
                        packageName: expectedPackageName,
                        untrustedPackageVersion: untrustedPackageVersion,
                        isPrivate: isPrivate,
                        untrustedIdentity: undefined
                    };
                }
            }
            // Find an entry that provides an identity.
            let identity = null;
            for (let entry of signature.entries) {
                const handler = registry_1.availableEntryHandlersByName.get(entry.entry);
                if (handler === undefined) {
                    throw new Error("handler is undefined, even though it was previously checked");
                }
                const localIdentity = handler.getIdentity(entry.value);
                if (localIdentity !== null) {
                    identity = localIdentity;
                    break;
                }
            }
            if (identity === null) {
                return {
                    status: types_1.ModuleVerificationStatus.Compromised,
                    reason: "No identity information in signature.json",
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate,
                    untrustedIdentity: undefined
                };
            }
            // Now we know the package contents matches the files expected by the signature, and all
            // of the hashes match, but now we need to locate the public keys for the signature so
            // we can verify it.
            let identityProvider;
            if (identity.keybaseUser !== undefined) {
                identityProvider = keybase_1.KeybaseIdentityProvider;
            }
            else if (identity.pgpPublicKeyUrl !== undefined) {
                identityProvider = pgp_1.PgpIdentityProvider;
            }
            else {
                return {
                    status: types_1.ModuleVerificationStatus.Compromised,
                    reason: "Unknown identity in signature.json",
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate,
                    untrustedIdentity: undefined
                };
            }
            // Verify each of the entries.
            const context = {
                dir: dir,
                relFilesOnDisk: relFilesOnDisk,
                expectedPackageName: expectedPackageName,
                untrustedIdentity: identity,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
                entries: signature.entries
            };
            for (const entry of signature.entries) {
                const handler = registry_1.availableEntryHandlersByName.get(entry.entry);
                if (handler === undefined) {
                    throw new Error("handler is undefined, even though it was previously checked");
                }
                const entryResult = yield handler.verifyEntry(context, entry.value);
                if (entryResult !== null) {
                    return entryResult;
                }
            }
            // Request the verifier verify the signature.
            if (!(yield identityProvider.verify({
                trustStore: this.trustStore
            }, identity, signature.signature, signature.locallyComputedDeterministicString))) {
                return {
                    status: types_1.ModuleVerificationStatus.Compromised,
                    reason: "The signature does not match",
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate,
                    untrustedIdentity: identity
                };
            }
            // Check the package name in package.json matches the expected
            // package name that was provided.
            let packageInfo = null;
            try {
                packageInfo = JSON.parse(yield fsPromise_1.readFilePromise(path.join(dir, "package.json")));
            }
            catch (e) {
                return {
                    status: types_1.ModuleVerificationStatus.Compromised,
                    reason: "Missing or unparsable package.json",
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate,
                    untrustedIdentity: identity
                };
            }
            if (packageInfo == null ||
                (packageInfo.name || "") != expectedPackageName) {
                return {
                    status: types_1.ModuleVerificationStatus.Compromised,
                    reason: "Provided package name in package.json did not match expected package name",
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate,
                    untrustedIdentity: identity
                };
            }
            // Package signature is valid, now we need to see if the identity
            // is trusted for the given package name.
            if (yield this.trustStore.isTrusted(identity, expectedPackageName)) {
                return {
                    status: types_1.ModuleVerificationStatus.Trusted,
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate,
                    trustedIdentity: identity
                };
            }
            else {
                return {
                    status: types_1.ModuleVerificationStatus.Untrusted,
                    untrustedIdentity: identity,
                    packageName: expectedPackageName,
                    untrustedPackageVersion: untrustedPackageVersion,
                    isPrivate: isPrivate
                };
            }
        });
    }
}
exports.ModuleVerifier = ModuleVerifier;
//# sourceMappingURL=moduleVerifier.js.map