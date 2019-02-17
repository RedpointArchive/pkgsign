import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";
export interface SignaturePackageJsonEntryData {
    packageJson: any;
}
export declare class SignaturePackageJsonEntry implements SignatureEntry {
    entry: string;
    packageJson: any;
    constructor(raw: SignaturePackageJsonEntryData);
    toDeterministicString(): any;
    verify(context: VerificationContext): Promise<ModuleVerificationResult | null>;
    getIdentity(): SignatureIdentity | null;
}
