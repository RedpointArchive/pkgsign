import { SignatureIdentity } from "./deterministicSignature";

export interface Verifier {
    verify(identity: SignatureIdentity, signature: string, deterministicSignature: string): Promise<boolean>;
}