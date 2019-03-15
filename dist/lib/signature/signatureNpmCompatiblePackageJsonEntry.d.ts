import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";
export interface SignatureNpmCompatiblePackageJsonEntryData {
    readonly packageJsonProperties: Array<string>;
    readonly sha512: string;
}
export declare class SignatureNpmCompatiblePackageJsonEntry implements SignatureEntry {
    static sha512OfObject(value: object, properties: Array<string>): Promise<string>;
    readonly entry: string;
    readonly packageJsonProperties: Array<string>;
    readonly sha512: string;
    constructor(raw: SignatureNpmCompatiblePackageJsonEntryData);
    toDeterministicString(): string;
    verify(context: VerificationContext): Promise<ModuleVerificationResult | null>;
    getIdentity(): SignatureIdentity | null;
}
