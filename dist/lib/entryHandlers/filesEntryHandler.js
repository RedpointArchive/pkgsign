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
const _1 = require(".");
const path_1 = require("path");
const fsPromise_1 = require("../util/fsPromise");
exports.FilesEntryHandler = {
    getEntryType: () => {
        return "files/v1alpha2";
    },
    generateEntry: (context) => __awaiter(this, void 0, void 0, function* () {
        let entries = [];
        for (let relPath of context.relFilesOnDisk) {
            const normalisedPath = relPath.replace(/\\/g, "/");
            if (normalisedPath == "signature.json") {
                // This file might be included in the Git repo to sign the contents of the
                // latest commit against Keybase or PGP, but it should never be included
                // in the signature (because we're about to replace it in the signed package
                // anyway).
                continue;
            }
            if (normalisedPath == "package.json") {
                // This file will be included in it's own package entry.
                try {
                    JSON.parse(yield fsPromise_1.readFilePromise(path_1.join(context.dir, relPath)));
                    // Skip package.json in files entry.
                    continue;
                }
                catch (e) {
                    console.warn("unable to parse package.json as JSON for signing");
                }
            }
            const hash = yield fsPromise_1.sha512OfFile(path_1.join(context.dir, relPath));
            entries.push({
                path: normalisedPath,
                sha512: hash
            });
        }
        return {
            files: entries
        };
    }),
    verifyEntry: (context, value) => __awaiter(this, void 0, void 0, function* () {
        const skipPackageJsonExactVerification = context.entries.some(x => {
            return (x.entry === "packageJson/v1alpha2" ||
                x.entry === "npmCompatiblePackageJson/v1alpha2");
        });
        // For each relative file on disk, make sure it appears in
        // the list of files the signature is signing for.
        for (let relFileOnDisk of context.relFilesOnDisk) {
            let normalisedPath = relFileOnDisk.replace(/\\/g, "/");
            if (normalisedPath == "signature.json") {
                continue;
            }
            if (normalisedPath == "package.json" &&
                skipPackageJsonExactVerification) {
                continue;
            }
            let found = false;
            let expectedHash = null;
            for (let expectedFile of value.files) {
                if (expectedFile.path == normalisedPath) {
                    found = true;
                    expectedHash = expectedFile.sha512;
                }
            }
            if (!found) {
                return _1.generateCompromisedVerificationResult(context, normalisedPath +
                    " exists in the package, but was not in the signature");
            }
            const hash = yield fsPromise_1.sha512OfFile(path_1.join(context.dir, normalisedPath));
            if (hash != expectedHash) {
                return _1.generateCompromisedVerificationResult(context, normalisedPath +
                    " does not have content that was signed for (mismatched hash)");
            }
        }
        // For each file in the signature, make sure it appears in expected files.
        // We don't need to hash here because if there is a match we will have already
        // checked it in the for loop above.
        for (let fileEntry of value.files) {
            if (fileEntry.path == "signature.json") {
                continue;
            }
            let found = false;
            for (let relFileOnDisk of context.relFilesOnDisk) {
                let normalisedPath = relFileOnDisk.replace(/\\/g, "/");
                if (normalisedPath == fileEntry.path) {
                    found = true;
                }
            }
            if (!found) {
                return _1.generateCompromisedVerificationResult(context, fileEntry.path +
                    " is expected by the signature, but is missing in the package");
            }
        }
        // No invalidation of signature.
        return null;
    }),
    toDeterministicString: (value) => {
        let deterministicString = "";
        for (let entry of value.files) {
            deterministicString += entry.path + "\n" + entry.sha512 + "\n";
        }
        return deterministicString;
    },
    getIdentity: (value) => {
        // Does not provide identity information.
        return null;
    }
};
//# sourceMappingURL=filesEntryHandler.js.map