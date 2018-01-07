export interface SignatureFileEntry {
    path: string;
    sha512: string;
}
export interface SignatureInfo {
    version: string;
    files: SignatureFileEntry[];
    signature: string;
    identity: SignatureIdentity;
}
export interface SignatureIdentity {
    keybaseUser?: string;
    pgpPublicKeyUrl?: string;
}
export declare function createSignatureFromEntries(entries: SignatureFileEntry[]): string;
