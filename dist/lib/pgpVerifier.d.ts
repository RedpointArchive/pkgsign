import { Verifier } from "./verifier";
import { SignatureIdentity } from "./deterministicSignature";
export declare class PgpVerifier implements Verifier {
    verify(identity: SignatureIdentity, signature: string, deterministicSignature: string): Promise<boolean>;
}
