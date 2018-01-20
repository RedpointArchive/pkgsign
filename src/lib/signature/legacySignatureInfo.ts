import { SignatureFileEntry } from "./signatureFilesEntry";
import { SignatureIdentity } from "./signatureIdentity";

export interface LegacySignatureInfo {
    version: string;
    files: SignatureFileEntry[];
    signature: string;
    identity: SignatureIdentity;
}