import { TrustStore } from "./trustStore";
import { SignatureIdentity } from "./signature/signatureIdentity";
export declare enum ModuleVerificationStatus {
    Compromised = 0,
    Unsigned = 1,
    Untrusted = 2,
    Trusted = 3,
}
export interface ModuleVerificationResult {
    status: ModuleVerificationStatus;
    packageName: string;
    untrustedPackageVersion: string;
    isPrivate: boolean;
    reason?: string;
    trustedIdentity?: SignatureIdentity;
    untrustedIdentity?: SignatureIdentity;
}
export declare class ModuleVerifier {
    private trustStore;
    constructor(trustStore: TrustStore);
    verify(dir: string, relFilesOnDisk: string[], expectedPackageName: string): Promise<ModuleVerificationResult>;
}
