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
const jsonNormalize_1 = require("./jsonNormalize");
const fs = require("fs");
const path = require("path");
const crypto_1 = require("crypto");
// This is a list of all fields in package.json that the NPM CLI either:
//
// - Implicitly adds based on information from the registry
// - Adds based on CLI arguments or environment
// - Modifies the type or value of
//
// In effect, the user can't really trust any of these fields. In the future,
// we may have to just overwrite package.json with the version stored in
// signature.json if the NPM CLI continues to mangle the package.json file
// as much as it does.
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
    '_optional',
    '_development',
    '_args',
    'bugs',
    'bundleDependencies',
    'deprecated',
    'author',
    'homepage',
    'repository',
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
        return jsonNormalize_1.normalizeSync(this.packageJson);
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
                const normalizedActual = jsonNormalize_1.normalizeSync(packageJsonActual);
                const normalizedExpected = jsonNormalize_1.normalizeSync(this.packageJson);
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
class SignaturePackageJsonPropertiesEntry {
    constructor(raw) {
        this.entry = "packageJson/v1alpha2";
        this.sha512 = raw.sha512;
        this.packageJsonProperties = raw.packageJsonProperties;
        if (this.packageJsonProperties) {
            this.packageJsonProperties = this.packageJsonProperties.sort();
        }
    }
    static sha512OfObject(value, properties) {
        return __awaiter(this, void 0, void 0, function* () {
            const orderedObject = {};
            properties.sort().forEach((key) => orderedObject[key] = value[key]);
            const hash = crypto_1.createHash('sha512');
            hash.update(jsonNormalize_1.normalizeSync(orderedObject));
            const hashStr = hash.digest('hex');
            console.log('verifying', properties, value, orderedObject, hashStr);
            return hashStr;
        });
    }
    toDeterministicString() {
        return jsonNormalize_1.normalizeSync(this.packageJsonProperties) + '\n' + this.sha512;
    }
    verify(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.packageJsonProperties) {
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
                const hash = yield SignaturePackageJsonPropertiesEntry.sha512OfObject(packageJsonActual, this.packageJsonProperties);
                if (hash != this.sha512) {
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
exports.SignaturePackageJsonPropertiesEntry = SignaturePackageJsonPropertiesEntry;
//# sourceMappingURL=signaturePackageJsonEntry.js.map