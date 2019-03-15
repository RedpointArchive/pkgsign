"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const signatureFilesEntry_1 = require("./signature/signatureFilesEntry");
const signatureIdentityEntry_1 = require("./signature/signatureIdentityEntry");
const signaturePackageJsonEntry_1 = require("./signature/signaturePackageJsonEntry");
const signatureNpmCompatiblePackageJsonEntry_1 = require("./signature/signatureNpmCompatiblePackageJsonEntry");
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
    '_args'
];
class SignatureParser {
    parse(packageName, packageJson, signatureJson) {
        let obj = JSON.parse(signatureJson);
        // Check for legacy signature we need to convert.
        if (obj.version !== undefined && obj.version === 'v1alpha') {
            let legacyObj = obj;
            let newObj = {
                entries: [
                    new signatureFilesEntry_1.SignatureFilesEntry({
                        files: legacyObj.files,
                    }),
                    new signatureIdentityEntry_1.SignatureIdentityEntry({
                        identity: legacyObj.identity,
                    }),
                ],
                signature: legacyObj.signature,
                isLegacySignature: true,
            };
            obj = newObj;
        }
        else {
            // Prevent someone setting isLegacySignature in signature.json 
            // in an effort to manipulate signature verification on newer
            // formats.
            let newObj = obj;
            if (newObj.isLegacySignature !== undefined) {
                delete newObj.isLegacySignature;
            }
            // Upgrade the entries to the actual TypeScript classes.
            let rawEntries = newObj.entries;
            newObj.entries = [];
            const npmUsed = this.isPackageInstalledWithNpm(packageJson) || this.isPackagePublishedWithNpm(packageJson);
            const npmCompatibleCheck = rawEntries.some((entry) => entry.entry === "npmCompatiblePackageJson/v1alpha1");
            for (let i = 0; i < rawEntries.length; i++) {
                let instance = null;
                switch (rawEntries[i].entry) {
                    case "files/v1alpha1":
                        instance = new signatureFilesEntry_1.SignatureFilesEntry(rawEntries[i]);
                        break;
                    case "identity/v1alpha1":
                        instance = new signatureIdentityEntry_1.SignatureIdentityEntry(rawEntries[i]);
                        break;
                    case "packageJson/v1alpha1":
                        if (npmUsed && npmCompatibleCheck) {
                            console.warn(`WARNING: package '${packageName}' is either published and/or installed with npm - falling back to limited verification of package.json`);
                            continue;
                        }
                        else {
                            instance = new signaturePackageJsonEntry_1.SignaturePackageJsonEntry(rawEntries[i]);
                        }
                        break;
                    case "npmCompatiblePackageJson/v1alpha1":
                        instance = new signatureNpmCompatiblePackageJsonEntry_1.SignatureNpmCompatiblePackageJsonEntry(rawEntries[i]);
                        break;
                }
                if (instance === null) {
                    throw new Error('unsupported entry type: ' + rawEntries[i].entry + ', try upgrading pkgsign');
                }
                newObj.entries.push(instance);
            }
        }
        return obj;
    }
    isPackageInstalledWithNpm(packageJson) {
        if (packageJson) {
            // if some of the npm generated keys are in the package.json of the installed
            // package, we can assume npm was used for installing the package
            return Object.keys(packageJson)
                .some((property) => generatedNpmKeys.indexOf(property) >= 0);
        }
        // can't assume the package was installed with npm - verification would fail if so
        return false;
    }
    isPackagePublishedWithNpm(packageJson) {
        if (packageJson) {
            // at least gitHead is added to package.json when publishing with npm
            return Object.keys(packageJson).sort().indexOf('gitHead') >= 0;
        }
        // can't assume the package was published with npm - verification would fail if so
        return false;
    }
}
exports.SignatureParser = SignatureParser;
function createDeterministicString(signature) {
    if (signature.isLegacySignature) {
        // Compatibility with v1alpha.
        let filesEntry = null;
        for (let entry of signature.entries) {
            if (entry.entry === 'files/v1alpha1') {
                filesEntry = entry;
                break;
            }
        }
        if (filesEntry === null) {
            throw new Error('expected legacy signature to contain files/v1alpha1, but it was missing');
        }
        return filesEntry.toDeterministicString();
    }
    else {
        let deterministicString = '';
        for (let entry of signature.entries) {
            deterministicString += entry.entry + '\n';
            deterministicString += entry.toDeterministicString().trim() + '\n';
        }
        return deterministicString.trim();
    }
}
exports.createDeterministicString = createDeterministicString;
//# sourceMappingURL=signature.js.map