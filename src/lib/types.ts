export interface SignatureIdentity {
  keybaseUser?: string;
  pgpPublicKeyUrl?: string;
}

export function identityToString(identity: SignatureIdentity) {
  if (identity.keybaseUser !== undefined) {
    return "@" + identity.keybaseUser;
  } else {
    return identity.pgpPublicKeyUrl;
  }
}

export enum ModuleVerificationStatus {
  // When the data on disk or in the package explicitly does not
  // match the expected state of the signature (either extra files,
  // missing files, mismatched hashes or signature doesn't verify).
  Compromised,

  // When the package doesn't have a signature or it can't be loaded.
  Unsigned,

  // When the package has a valid signature, but the user or device
  // doesn't trust the associated identity.
  Untrusted,

  // When the package has a valid signature and the user or device
  // trusts the associated identity.
  Trusted
}

export interface ModuleVerificationResult {
  status: ModuleVerificationStatus;
  packageName: string;
  untrustedPackageVersion: string;
  isPrivate: boolean;
  reason?: string;
  trustedIdentity?: SignatureIdentity;
  untrustedIdentity?: SignatureIdentity;
}

export interface IGenerateEntryContext {
  // The directory of the module being signed.
  dir: string;

  // A list of relative file paths expected on disk for this module.
  relFilesOnDisk: string[];

  // The identity that is signing the package.
  signingIdentity: SignatureIdentity;
}

export interface IVerifyEntryContext {
  // The directory of the module being verified.
  dir: string;

  // A list of relative file paths expected on disk for this module.
  relFilesOnDisk: string[];

  // The expected package name.
  expectedPackageName: string;

  // The untrusted package version.
  untrustedPackageVersion: string;

  // The untrusted identity.
  untrustedIdentity: SignatureIdentity;

  // Whether the module is private.
  isPrivate: boolean;

  // A list of all of the signature entries included in the signature (unverified).
  entries: Entry<any>[];
}

export type Entry<T> = { entry: string; value: T };
