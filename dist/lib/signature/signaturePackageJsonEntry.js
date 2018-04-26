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
const json_normalize_1 = require("json-normalize");
const fs = require("fs");
const path = require("path");
const generatedNpmKeys = [
    '_from',
    '_id',
    '_inBundle',
    '_integrity',
    '_location',
    '_phantomChildren',
    '_requested',
    '_requiredBy',
    '_resolved',
    '_shasum',
    '_spec',
    '_where',
];
/**
 * Used as the replacer for JSON stringify where it filters out any NPM injected
 * package.json keys.
 *
 * @param key The key of the JSON property.
 * @param value The value of the JSON property.
 */
exports.stripNpmMetadataFieldFromPackageInfo = (packageInfo) => {
    for (let key of Object.keys(packageInfo)) {
        if (generatedNpmKeys.indexOf(key) !== -1) {
            delete packageInfo[key];
        }
    }
};
class SignaturePackageJsonEntry {
    constructor(raw) {
        this.entry = "packageJson/v1alpha1";
        this.packageJson = raw.packageJson;
        // Strip NPM metadata from packageJson value.
        exports.stripNpmMetadataFieldFromPackageInfo(this.packageJson);
    }
    toDeterministicString() {
        return json_normalize_1.stringifySync(this.packageJson);
    }
    verify(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.packageJson == null) {
                // Verify that package.json does not exist on disk.
                if (context.relFilesOnDisk.indexOf('package.json') !== -1) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: 'package.json exists in the package, but was not in the signature',
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate,
                    };
                }
            }
            else {
                // Verify that package.json does exist on disk.
                if (context.relFilesOnDisk.indexOf('package.json') === -1) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: 'package.json does not exist in the package, but was present in the signature',
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate,
                    };
                }
                // Try to read the contents of package.json.
                const packageJsonRaw = fs.readFileSync(path.join(context.dir, 'package.json'), 'utf8');
                let packageJsonActual;
                try {
                    packageJsonActual = JSON.parse(packageJsonRaw);
                }
                catch (e) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: 'package.json does not contain valid JSON',
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate,
                    };
                }
                // Strip NPM metadata from actual package.json value.
                exports.stripNpmMetadataFieldFromPackageInfo(packageJsonActual);
                // Stringify both our expected and actual values.
                const normalizedActual = json_normalize_1.stringifySync(packageJsonActual);
                const normalizedExpected = json_normalize_1.stringifySync(this.packageJson);
                // If they don't match, then package.json doesn't match the expected value.
                if (normalizedActual !== normalizedExpected) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: 'package.json on disk does not match the signed package.json',
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
        return null;
    }
}
exports.SignaturePackageJsonEntry = SignaturePackageJsonEntry;
//# sourceMappingURL=signaturePackageJsonEntry.js.map