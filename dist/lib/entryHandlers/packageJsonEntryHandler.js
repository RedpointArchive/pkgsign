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
const jsonNormalize_1 = require("../thirdparty/jsonNormalize");
const fs_1 = require("fs");
const path_1 = require("path");
const fsPromise_1 = require("../util/fsPromise");
exports.PackageJsonEntryHandler = {
    getEntryType: () => {
        return "packageJson/v1alpha2";
    },
    generateEntry: (context) => __awaiter(this, void 0, void 0, function* () {
        let packageJson = undefined;
        for (let relPath of context.relFilesOnDisk) {
            const normalisedPath = relPath.replace(/\\/g, "/");
            if (normalisedPath == "package.json") {
                // This file will be included in it's own package entry.
                try {
                    packageJson = JSON.parse(yield fsPromise_1.readFilePromise(path_1.join(context.dir, relPath)));
                }
                catch (e) {
                    console.warn("unable to parse package.json as JSON for signing");
                    packageJson = undefined; /* do not include package json signature entry, so file validation will fallback to exact match */
                }
                break;
            }
        }
        if (packageJson === undefined) {
            // We couldn't find or parse package.json, do not generate an entry.
            // If package.json exists and is unparseable, FilesEntryHandler will
            // include it in the list of files to directly hash.
            return null;
        }
        return {
            packageJson
        };
    }),
    verifyEntry: (context, value) => __awaiter(this, void 0, void 0, function* () {
        if (value.packageJson == null) {
            // Verify that package.json does not exist on disk.
            if (context.relFilesOnDisk.indexOf("package.json") !== -1) {
                return _1.generateCompromisedVerificationResult(context, "package.json exists in the package, but was not in the signature");
            }
        }
        else {
            // Verify that package.json does exist on disk.
            if (context.relFilesOnDisk.indexOf("package.json") === -1) {
                return _1.generateCompromisedVerificationResult(context, "package.json does not exist in the package, but was present in the signature");
            }
            // Try to read the contents of package.json.
            const packageJsonRaw = fs_1.readFileSync(path_1.join(context.dir, "package.json"), "utf8");
            let packageJsonActual;
            try {
                packageJsonActual = JSON.parse(packageJsonRaw);
            }
            catch (e) {
                return _1.generateCompromisedVerificationResult(context, "package.json does not contain valid JSON");
            }
            // Stringify both our expected and actual values.
            const normalizedActual = jsonNormalize_1.normalizeSync(packageJsonActual);
            const normalizedExpected = jsonNormalize_1.normalizeSync(value.packageJson);
            // If they don't match, then package.json doesn't match the expected value.
            if (normalizedActual !== normalizedExpected) {
                return _1.generateCompromisedVerificationResult(context, "package.json on disk does not match the signed package.json");
            }
        }
        // No invalidation of signature.
        return null;
    }),
    toDeterministicString: (value) => {
        return jsonNormalize_1.normalizeSync(value.packageJson);
    },
    getIdentity: (value) => {
        return null;
    }
};
//# sourceMappingURL=packageJsonEntryHandler.js.map