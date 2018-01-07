import { SignatureIdentity } from "./deterministicSignature";
import { TrustStore } from "./trustStore";
export declare enum ModuleVerificationStatus {
    Compromised = 0,
    Unsigned = 1,
    Untrusted = 2,
    Trusted = 3,
}
export interface ModuleVerificationResult {
    status: ModuleVerificationStatus;
    reason?: string;
    untrustedIdentity?: SignatureIdentity;
}
export declare class ModuleVerifier {
    private trustStore;
    constructor(trustStore: TrustStore);
    verify(dir: string, relFilesOnDisk: string[], expectedPackageName: string): Promise<ModuleVerificationResult>;
}
