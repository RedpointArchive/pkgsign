import { Verifier } from "./verifier";
import { ITrustStore } from "./trustStore";
import { SignatureIdentity } from "./signature/signatureIdentity";
export declare class PgpVerifier implements Verifier {
    private trustStore;
    constructor(trustStore: ITrustStore);
    verify(identity: SignatureIdentity, signature: string, deterministicString: string): Promise<boolean>;
}
