"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createSignatureFromEntries(entries) {
    let deterministicSignatureString = '';
    for (let entry of entries) {
        deterministicSignatureString += entry.path + '\n' + entry.sha512 + '\n';
    }
    return deterministicSignatureString;
}
exports.createSignatureFromEntries = createSignatureFromEntries;
//# sourceMappingURL=deterministicSignature.js.map