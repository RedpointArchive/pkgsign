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
class SignatureNpmCompatiblePackageJsonEntry {
    constructor(raw) {
        this.entry = "npmCompatiblePackageJson/v1alpha1";
        this.sha512 = raw.sha512;
        this.packageJsonProperties = raw.packageJsonProperties;
        if (this.packageJsonProperties) {
            this.packageJsonProperties = this.packageJsonProperties
                // exclude _XXX properties
                .filter(value => value.indexOf("_") != 0)
                .sort();
        }
    }
    static sha512OfObject(value, properties) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    toDeterministicString() {
        return jsonNormalize_1.normalizeSync(this.packageJsonProperties) + "\n" + this.sha512;
    }
    verify(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.packageJsonProperties) {
                // Verify that package.json does not exist on disk.
                if (context.relFilesOnDisk.indexOf("package.json") !== -1) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: "package.json exists in the package, but was not in the signature",
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate
                    };
                }
            }
            else {
                // Verify that package.json does exist on disk.
                if (context.relFilesOnDisk.indexOf("package.json") === -1) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: "package.json does not exist in the package, but was present in the signature",
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate
                    };
                }
                // Try to read the contents of package.json.
                const packageJsonRaw = fs.readFileSync(path.join(context.dir, "package.json"), "utf8");
                let packageJsonActual;
                try {
                    packageJsonActual = JSON.parse(packageJsonRaw);
                }
                catch (e) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: "package.json does not contain valid JSON",
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate
                    };
                }
                const hash = yield SignatureNpmCompatiblePackageJsonEntry.sha512OfObject(packageJsonActual, this.packageJsonProperties);
                if (hash != this.sha512) {
                    return {
                        status: moduleVerifier_1.ModuleVerificationStatus.Compromised,
                        reason: "package.json on disk does not match the signed package.json",
                        packageName: context.expectedPackageName,
                        untrustedIdentity: context.untrustedIdentity,
                        untrustedPackageVersion: context.untrustedPackageVersion,
                        isPrivate: context.isPrivate
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
exports.SignatureNpmCompatiblePackageJsonEntry = SignatureNpmCompatiblePackageJsonEntry;
//# sourceMappingURL=signatureNpmCompatiblePackageJsonEntry.js.map