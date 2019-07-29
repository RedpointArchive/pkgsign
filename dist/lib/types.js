"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function identityToString(identity) {
    if (identity.keybaseUser !== undefined) {
        return "@" + identity.keybaseUser;
    }
    else if (identity.pgpPublicKeyUrl !== undefined) {
        return identity.pgpPublicKeyUrl;
    }
    else {
        throw new Error("unknown SignatureIdentity content, cannot convert to string");
    }
}
exports.identityToString = identityToString;
var ModuleVerificationStatus;
(function (ModuleVerificationStatus) {
    // When the data on disk or in the package explicitly does not
    // match the expected state of the signature (either extra files,
    // missing files, mismatched hashes or signature doesn't verify).
    ModuleVerificationStatus[ModuleVerificationStatus["Compromised"] = 0] = "Compromised";
    // When the package doesn't have a signature or it can't be loaded.
    ModuleVerificationStatus[ModuleVerificationStatus["Unsigned"] = 1] = "Unsigned";
    // When the package has a valid signature, but the user or device
    // doesn't trust the associated identity.
    ModuleVerificationStatus[ModuleVerificationStatus["Untrusted"] = 2] = "Untrusted";
    // When the package has a valid signature and the user or device
    // trusts the associated identity.
    ModuleVerificationStatus[ModuleVerificationStatus["Trusted"] = 3] = "Trusted";
})(ModuleVerificationStatus = exports.ModuleVerificationStatus || (exports.ModuleVerificationStatus = {}));
//# sourceMappingURL=types.js.map