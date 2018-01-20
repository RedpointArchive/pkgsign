import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";

export interface SignatureIdentityEntryData {
    identity: SignatureIdentity;
}

export class SignatureIdentityEntry implements SignatureEntry {
    public entry: string = "identity/v1alpha1";
    public identity: SignatureIdentity;

    constructor(raw: SignatureIdentityEntryData) {
        this.identity = raw.identity;
    }

    public toDeterministicString() {
        if (this.identity.keybaseUser !== undefined) {
            return 'keybase:' + this.identity.keybaseUser;
        } else if (this.identity.pgpPublicKeyUrl !== undefined) {
            return 'httpspgp:' + this.identity.pgpPublicKeyUrl;
        } else {
            return 'none';
        }
    }
    
    async verify(context: VerificationContext): Promise<ModuleVerificationResult | null> {
        // Nothing to verify on disk or in context. However, the data contained within
        // this entry is still validated by the signature as part of the deterministic
        // string.
        return null;
    }

    getIdentity(): SignatureIdentity | null {
        return this.identity;
    }
}