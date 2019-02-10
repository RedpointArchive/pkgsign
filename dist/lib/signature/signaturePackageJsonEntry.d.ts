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
export interface SignaturePackageJsonPropertiesEntryData {
    readonly packageJsonProperties: Array<string>;
    readonly sha512: string;
}
export declare class SignaturePackageJsonPropertiesEntry implements SignatureEntry {
    static sha512OfObject(value: object, properties: Array<string>): Promise<string>;
    readonly entry: string;
    readonly packageJsonProperties: Array<string>;
    readonly sha512: string;
    constructor(raw: SignaturePackageJsonPropertiesEntryData);
    toDeterministicString(): string;
    verify(context: VerificationContext): Promise<ModuleVerificationResult | null>;
    getIdentity(): SignatureIdentity | null;
}
