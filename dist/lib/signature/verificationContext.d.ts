import { SignatureIdentity } from "./signatureIdentity";
import { SignatureEntry } from "../signature";
export interface VerificationContext {
    dir: string;
    relFilesOnDisk: string[];
    expectedPackageName: string;
    untrustedPackageVersion: string;
    untrustedIdentity: SignatureIdentity;
    isPrivate: boolean;
    signatureEntries: SignatureEntry[];
}
