import { SignatureIdentity } from "./deterministicSignature";
import { Verifier } from "./verifier";
import { TrustStore } from "./trustStore";
export declare class KeybaseVerifier implements Verifier {
    private trustStore;
    constructor(trustStore: TrustStore);
    verify(identity: SignatureIdentity, signature: string, deterministicSignature: string): Promise<boolean>;
}
