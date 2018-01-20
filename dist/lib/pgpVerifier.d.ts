import { Verifier } from "./verifier";
import { TrustStore } from "./trustStore";
import { SignatureIdentity } from "./signature/signatureIdentity";
export declare class PgpVerifier implements Verifier {
    private trustStore;
    constructor(trustStore: TrustStore);
    verify(identity: SignatureIdentity, signature: string, deterministicString: string): Promise<boolean>;
}
