import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";
export interface SignatureIdentityEntryData {
    identity: SignatureIdentity;
}
export declare class SignatureIdentityEntry implements SignatureEntry {
    entry: string;
    identity: SignatureIdentity;
    constructor(raw: SignatureIdentityEntryData);
    toDeterministicString(): string;
    verify(context: VerificationContext): Promise<ModuleVerificationResult | null>;
    getIdentity(): SignatureIdentity | null;
}
