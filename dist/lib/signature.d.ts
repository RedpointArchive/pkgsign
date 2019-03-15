import { VerificationContext } from "./signature/verificationContext";
import { ModuleVerificationResult } from "./moduleVerifier";
import { SignatureIdentity } from "./signature/signatureIdentity";
export interface SignatureInfo {
    entries: SignatureEntry[];
    signature: string;
    isLegacySignature?: boolean;
}
export interface SignatureEntry {
    entry: string;
    toDeterministicString(): string;
    verify(context: VerificationContext): Promise<ModuleVerificationResult | null>;
    getIdentity(): SignatureIdentity | null;
}
export declare class SignatureParser {
    parse(packageName: string, packageJson: object | null, signatureJson: string): SignatureInfo;
    private isPackageInstalledWithNpm;
    private isPackagePublishedWithNpm;
}
export declare function createDeterministicString(signature: SignatureInfo): string;
