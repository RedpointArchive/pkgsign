"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
/**
 * `generateCompromisedVerificationResult` returns a verification result with the
 * status Compromised and the specified message. Helps keep the `verifyContent`
 * of entry handlers shorter by copying across all the boilerplate to the result.
 *
 * @param context The verification context.
 * @param msg The message to attach to the verification result.
 */
function generateCompromisedVerificationResult(context, msg) {
    return {
        status: types_1.ModuleVerificationStatus.Compromised,
        reason: msg,
        packageName: context.expectedPackageName,
        untrustedIdentity: context.untrustedIdentity,
        untrustedPackageVersion: context.untrustedPackageVersion,
        isPrivate: context.isPrivate
    };
}
exports.generateCompromisedVerificationResult = generateCompromisedVerificationResult;
//# sourceMappingURL=index.js.map