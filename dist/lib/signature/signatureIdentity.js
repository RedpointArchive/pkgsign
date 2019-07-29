"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function identityToString(identity) {
    if (identity.keybaseUser !== undefined) {
        return "@" + identity.keybaseUser;
    }
    else {
        return identity.pgpPublicKeyUrl;
    }
}
exports.identityToString = identityToString;
//# sourceMappingURL=signatureIdentity.js.map