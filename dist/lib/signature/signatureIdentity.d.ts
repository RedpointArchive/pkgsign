export interface SignatureIdentity {
    keybaseUser?: string;
    pgpPublicKeyUrl?: string;
}
export declare function identityToString(identity: SignatureIdentity): string;
