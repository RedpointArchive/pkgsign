import { SignatureIdentity } from "./signatureIdentity";
import { SignatureEntry } from "../signature";

export interface VerificationContext {
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
    signatureEntries: SignatureEntry[];
}