export declare type SignatureIdentity = {
    keybaseUser?: string;
    pgpPublicKeyUrl?: string;
};
export declare function identityToString(identity: SignatureIdentity): string;
export declare enum ModuleVerificationStatus {
    Compromised = 0,
    Unsigned = 1,
    Untrusted = 2,
    Trusted = 3
}
export declare type ModuleVerificationResult = {
    status: ModuleVerificationStatus.Compromised;
    packageName: string;
    untrustedPackageVersion: string;
    isPrivate: boolean;
    reason?: string;
    untrustedIdentity: SignatureIdentity | undefined;
} | {
    status: ModuleVerificationStatus.Untrusted;
    packageName: string;
    untrustedPackageVersion: string;
    isPrivate: boolean;
    reason?: string;
    untrustedIdentity: SignatureIdentity;
} | {
    status: ModuleVerificationStatus.Trusted;
    packageName: string;
    untrustedPackageVersion: string;
    isPrivate: boolean;
    reason?: string;
    trustedIdentity: SignatureIdentity;
} | {
    status: ModuleVerificationStatus.Unsigned;
    packageName: string;
    untrustedPackageVersion: string;
    isPrivate: boolean;
    reason?: string;
};
export interface IGenerateEntryContext {
    dir: string;
    relFilesOnDisk: string[];
    signingIdentity: SignatureIdentity;
}
export interface IVerifyEntryContext {
    dir: string;
    relFilesOnDisk: string[];
    expectedPackageName: string;
    untrustedPackageVersion: string;
    untrustedIdentity: SignatureIdentity;
    isPrivate: boolean;
    entries: Entry<any>[];
}
export declare type Entry<T> = {
    entry: string;
    value: T;
};
