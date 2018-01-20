import { SignatureIdentity } from "./signature/signatureIdentity";

export interface Verifier {
    verify(identity: SignatureIdentity, signature: string, deterministicSignature: string): Promise<boolean>;
}