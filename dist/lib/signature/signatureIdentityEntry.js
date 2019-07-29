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
class SignatureIdentityEntry {
    constructor(raw) {
        this.entry = "identity/v1alpha1";
        this.identity = raw.identity;
    }
    toDeterministicString() {
        if (this.identity.keybaseUser !== undefined) {
            return "keybase:" + this.identity.keybaseUser;
        }
        else if (this.identity.pgpPublicKeyUrl !== undefined) {
            return "httpspgp:" + this.identity.pgpPublicKeyUrl;
        }
        else {
            return "none";
        }
    }
    verify(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Nothing to verify on disk or in context. However, the data contained within
            // this entry is still validated by the signature as part of the deterministic
            // string.
            return null;
        });
    }
    getIdentity() {
        return this.identity;
    }
}
exports.SignatureIdentityEntry = SignatureIdentityEntry;
//# sourceMappingURL=signatureIdentityEntry.js.map