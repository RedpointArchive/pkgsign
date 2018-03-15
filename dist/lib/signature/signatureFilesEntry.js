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
const moduleVerifier_1 = require("../moduleVerifier");
const path = require("path");
const fsPromise_1 = require("../fsPromise");
class SignatureFilesEntry {
    constructor(raw) {
        this.entry = "files/v1alpha1";
        this.files = raw.files;
    }
    toDeterministicString() {
        let deterministicString = '';
        for (let entry of this.files) {
            deterministicString += entry.path + '\n' + entry.sha512 + '\n';
        }
        return deterministicString;
    }
    verify(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // For each relative file on disk, make sure it appears in
            // the list of files the signature is signing for.
            for (let relFileOnDisk of context.relFilesOnDisk) {
                let normalisedPath = relFileOnDisk.replace(/\\/g, '/');
                if (normalisedPath == 'signature.json') {
                    continue;
                }
                let found = false;
                let expectedHash = null;
                for (let expectedFile of this.files) {
                    if (expectedFile.path == normalisedPath) {
                        found = true;
                        expectedHash = expectedFile.sha512;
                    }
                }
                if (!found) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: normalisedPath + ' exists in the package, but was not in the signature',
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate,
                    };
                }
                const hash = yield fsPromise_1.sha512OfFile(path.join(context.dir, normalisedPath));
                if (hash != expectedHash) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: normalisedPath + ' does not have content that was signed for (mismatched hash)',
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate,
                    };
                }
            }
            // For each file in the signature, make sure it appears in expected files.
            // We don't need to hash here because if there is a match we will have already
            // checked it in the for loop above.
            for (let fileEntry of this.files) {
                if (fileEntry.path == 'signature.json') {
                    continue;
                }
                let found = false;
                for (let relFileOnDisk of context.relFilesOnDisk) {
                    let normalisedPath = relFileOnDisk.replace(/\\/g, '/');
                    if (normalisedPath == fileEntry.path) {
                        found = true;
                    }
                }
                if (!found) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: fileEntry.path + ' is expected by the signature, but is missing in the package',
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate,
                    };
                }
            }
            // No invalidation of signature.
            return null;
        });
    }
    getIdentity() {
        // Does not provide identity information.
        return null;
    }
}
exports.SignatureFilesEntry = SignatureFilesEntry;
//# sourceMappingURL=signatureFilesEntry.js.map