import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";
/**
 * Used as the replacer for JSON stringify where it filters out any NPM injected
 * package.json keys.
 *
 * @param key The key of the JSON property.
 * @param value The value of the JSON property.
 */
export declare const stripNpmMetadataFieldFromPackageInfo: (packageInfo: any) => void;
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
