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
const registry_1 = require("./entryHandlers/registry");
function createSignedSignatureDocument(entries, identityProvider, identityProviderContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const signatureDocument = {
            entries,
            signature: ""
        };
        let deterministicString = "";
        for (const entry of entries) {
            deterministicString += entry.entry + "\n";
            const handler = registry_1.availableEntryHandlersByName.get(entry.entry);
            if (handler === undefined) {
                throw new Error("can not build deterministic string with unknown handler");
            }
            deterministicString +=
                handler.toDeterministicString(entry.value).trim() + "\n";
        }
        signatureDocument.signature = yield identityProvider.signEntries(identityProviderContext, deterministicString);
        return JSON.stringify(signatureDocument, null, 2);
    });
}
exports.createSignedSignatureDocument = createSignedSignatureDocument;
function readUnverifiedSignatureDocument(documentContent) {
    return __awaiter(this, void 0, void 0, function* () {
        const signatureDocument = JSON.parse(documentContent);
        let deterministicString = "";
        for (const entry of signatureDocument.entries) {
            deterministicString += entry.entry + "\n";
            const handler = registry_1.availableEntryHandlersByName.get(entry.entry);
            if (handler === undefined) {
                throw new Error("can not build deterministic string with unknown handler");
            }
            deterministicString +=
                handler.toDeterministicString(entry.value).trim() + "\n";
        }
        return {
            entries: signatureDocument.entries,
            signature: signatureDocument.signature,
            locallyComputedDeterministicString: deterministicString
        };
    });
}
exports.readUnverifiedSignatureDocument = readUnverifiedSignatureDocument;
//# sourceMappingURL=signature.js.map