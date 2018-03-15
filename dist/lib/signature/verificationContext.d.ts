import { SignatureIdentity } from "./signatureIdentity";
export interface VerificationContext {
    dir: string;
    relFilesOnDisk: string[];
    expectedPackageName: string;
    untrustedPackageVersion: string;
    untrustedIdentity: SignatureIdentity;
    isPrivate: boolean;
}
