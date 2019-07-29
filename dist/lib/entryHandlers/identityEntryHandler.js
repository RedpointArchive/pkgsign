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
exports.IdentityEntryHandler = {
    getEntryType: () => {
        return "identity/v1alpha2";
    },
    generateEntry: (context) => __awaiter(this, void 0, void 0, function* () {
        return {
            identity: context.signingIdentity
        };
    }),
    verifyEntry: (context, value) => __awaiter(this, void 0, void 0, function* () {
        // Nothing to verify on disk or in context. However, the data contained within
        // this entry is still validated by the signature as part of the deterministic
        // string.
        return null;
    }),
    toDeterministicString: (value) => {
        if (value.identity.keybaseUser !== undefined) {
            return "keybase:" + value.identity.keybaseUser;
        }
        else if (value.identity.pgpPublicKeyUrl !== undefined) {
            return "httpspgp:" + value.identity.pgpPublicKeyUrl;
        }
        else {
            return "none";
        }
    },
    getIdentity: (value) => {
        return {
            keybaseUser: value.identity.keybaseUser,
            pgpPublicKeyUrl: value.identity.pgpPublicKeyUrl
        };
    }
};
//# sourceMappingURL=identityEntryHandler.js.map