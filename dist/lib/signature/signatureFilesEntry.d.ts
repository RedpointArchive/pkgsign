import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";
export interface SignatureFilesEntryData {
    files: SignatureFileEntry[];
}
export declare class SignatureFilesEntry implements SignatureEntry {
    entry: string;
    files: SignatureFileEntry[];
    constructor(raw: SignatureFilesEntryData);
    toDeterministicString(): string;
    verify(context: VerificationContext): Promise<ModuleVerificationResult | null>;
    getIdentity(): SignatureIdentity | null;
}
export interface SignatureFileEntry {
    path: string;
    sha512: string;
}
