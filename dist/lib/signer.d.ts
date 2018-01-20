import { SignatureIdentity } from "./signature/signatureIdentity";
export interface Signer {
    getIdentity(): Promise<SignatureIdentity>;
    signEntries(deterministicSignature: string): Promise<string>;
}
