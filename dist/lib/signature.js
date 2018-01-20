"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const signatureFilesEntry_1 = require("./signature/signatureFilesEntry");
const signatureIdentityEntry_1 = require("./signature/signatureIdentityEntry");
class SignatureParser {
    parse(json) {
        let obj = JSON.parse(json);
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
            for (let i = 0; i < rawEntries.length; i++) {
                let instance = null;
                switch (rawEntries[i].entry) {
                    case "files/v1alpha1":
                        instance = new signatureFilesEntry_1.SignatureFilesEntry(rawEntries[i]);
                        break;
                    case "identity/v1alpha1":
                        instance = new signatureIdentityEntry_1.SignatureIdentityEntry(rawEntries[i]);
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