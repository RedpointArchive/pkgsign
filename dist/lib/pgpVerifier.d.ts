import { Verifier } from "./verifier";
import { SignatureIdentity } from "./deterministicSignature";
import { TrustStore } from "./trustStore";
export declare class PgpVerifier implements Verifier {
    private trustStore;
    constructor(trustStore: TrustStore);
    verify(identity: SignatureIdentity, signature: string, deterministicSignature: string): Promise<boolean>;
}
