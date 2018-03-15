export interface SignatureIdentity {
    keybaseUser?: string;
    pgpPublicKeyUrl?: string;
}

export function identityToString(identity: SignatureIdentity) {
    if (identity.keybaseUser !== undefined) {
        return '@' + identity.keybaseUser;
    } else {
        return identity.pgpPublicKeyUrl;
    }
}