import { IEntryHandler } from ".";
import {
  SignatureIdentity,
  ModuleVerificationResult,
  IVerifyEntryContext,
  IGenerateEntryContext
} from "../types";

interface IdentityEntry {
  identity: SignatureIdentity;
}

export const IdentityEntryHandler: IEntryHandler<IdentityEntry> = {
  getEntryType: (): string => {
    return "identity/v1alpha2";
  },

  generateEntry: async (
    context: IGenerateEntryContext
  ): Promise<IdentityEntry | null> => {
    return {
      identity: context.signingIdentity
    };
  },

  verifyEntry: async (
    context: IVerifyEntryContext,
    value: IdentityEntry
  ): Promise<ModuleVerificationResult> => {
    // Nothing to verify on disk or in context. However, the data contained within
    // this entry is still validated by the signature as part of the deterministic
    // string.
    return null;
  },

  toDeterministicString: (value: IdentityEntry): string => {
    if (this.identity.keybaseUser !== undefined) {
      return "keybase:" + this.identity.keybaseUser;
    } else if (this.identity.pgpPublicKeyUrl !== undefined) {
      return "httpspgp:" + this.identity.pgpPublicKeyUrl;
    } else {
      return "none";
    }
  },

  getIdentity: (value: IdentityEntry): SignatureIdentity => {
    return {
      keybaseUser: value.identity.keybaseUser,
      pgpPublicKeyUrl: value.identity.pgpPublicKeyUrl
    };
  }
};
