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
const crypto_1 = require("crypto");
const jsonNormalize_1 = require("../thirdparty/jsonNormalize");
const fs_1 = require("fs");
const path_1 = require("path");
const fsPromise_1 = require("../util/fsPromise");
function sha512OfObject(value, properties) {
    const orderedObject = {};
    properties
        // filter properties starting with underscore
        .filter(key => key.indexOf("_") != 0)
        .sort()
        .forEach(key => (orderedObject[key] = value[key]));
    const hash = crypto_1.createHash("sha512");
    hash.update(jsonNormalize_1.normalizeSync(orderedObject));
    const hashStr = hash.digest("hex");
    return hashStr;
}
function filter(val) {
    const v = {
        packageJsonProperties: val.packageJsonProperties,
        sha512: val.sha512
    };
    if (v.packageJsonProperties) {
        v.packageJsonProperties = v.packageJsonProperties
            // exclude _XXX properties
            .filter(value => value.indexOf("_") != 0)
            .sort();
    }
    return v;
}
exports.NpmCompatiblePackageJsonEntryHandler = {
    getEntryType: () => {
        return "npmCompatiblePackageJson/v1alpha2";
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
        return filter({
            packageJsonProperties: Object.keys(packageJson).sort(),
            sha512: yield sha512OfObject(packageJson, Object.keys(packageJson))
        });
    }),
    verifyEntry: (context, value) => __awaiter(this, void 0, void 0, function* () {
        value = filter(value);
        if (!value.packageJsonProperties) {
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
            const hash = sha512OfObject(packageJsonActual, value.packageJsonProperties);
            if (hash != value.sha512) {
                return _1.generateCompromisedVerificationResult(context, "package.json on disk does not match the signed package.json");
            }
        }
        // No invalidation of signature.
        return null;
    }),
    toDeterministicString: (value) => {
        value = filter(value);
        return jsonNormalize_1.normalizeSync(value.packageJsonProperties) + "\n" + value.sha512;
    },
    getIdentity: (value) => {
        return null;
    }
};
//# sourceMappingURL=npmCompatiblePackageJsonEntryHandler.js.map