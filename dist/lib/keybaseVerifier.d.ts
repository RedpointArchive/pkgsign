import { SignatureIdentity } from "./deterministicSignature";
import { Verifier } from "./verifier";
export declare class KeybaseVerifier implements Verifier {
    verify(identity: SignatureIdentity, signature: string, deterministicSignature: string): Promise<boolean>;
}
