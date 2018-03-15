import { SignatureInfo, createDeterministicString, SignatureParser } from "./signature";
import { readFilePromise, sha512OfFile } from "./fsPromise";
import * as path from 'path';
import { TrustStore } from "./trustStore";
import { Verifier } from "./verifier";
import { KeybaseVerifier } from "./keybaseVerifier";
import { PgpVerifier } from "./pgpVerifier";
import { SignatureIdentityEntry } from "./signature/signatureIdentityEntry";
import { SignatureIdentity } from "./signature/signatureIdentity";

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
    Trusted,
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

export class ModuleVerifier {
    constructor(private trustStore: TrustStore) { }

    public async verify(dir: string, relFilesOnDisk: string[], expectedPackageName: string): Promise<ModuleVerificationResult> {
        // Try to read whether or not the module is private early so we
        // can return the information to the caller. This field is untrusted, and
        // is only used by telemetry when determining the amount of data to send.
        let isPrivate = true;
        let untrustedPackageVersion = '';
        try {
            let earlyPackageInfo = JSON.parse(await readFilePromise(path.join(dir, 'package.json')));
            isPrivate = earlyPackageInfo.private || false;
            untrustedPackageVersion = earlyPackageInfo.version || '';
        } catch (e) {
        }

        // Load the signature document.
        let signature: SignatureInfo | null = null;
        try {
            let rawJson = await readFilePromise(path.join(dir, 'signature.json'));
            let signatureParser = new SignatureParser();
            signature = signatureParser.parse(rawJson);
        } catch (e) {
            return {
                status: ModuleVerificationStatus.Unsigned,
                reason: 'Missing or unparsable signature.json',
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
            };
        }

        // Build up our deterministic string to validate the signature against.
        const deterministicString = createDeterministicString(signature);
        
        // Find an entry that provides an identity.
        let identity: SignatureIdentity | null = null;
        for (let entry of signature.entries) {
            let localIdentity = entry.getIdentity();
            if (localIdentity !== null) {
                identity = localIdentity;
                break;
            }
        }
        if (identity === null) {
            return {
                status: ModuleVerificationStatus.Compromised,
                reason: 'No identity information in signature.json',
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
            };
        }

        // Now we know the package contents matches the files expected by the signature, and all
        // of the hashes match, but now we need to locate the public keys for the signature so
        // we can verify it.
        let verifier: Verifier;
        if (identity.keybaseUser !== undefined) {
            verifier = new KeybaseVerifier(this.trustStore);
        } else if (identity.pgpPublicKeyUrl !== undefined) {
            verifier = new PgpVerifier(this.trustStore);
        } else {
            return {
                status: ModuleVerificationStatus.Compromised,
                reason: 'Unknown identity in signature.json',
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
            };
        }

        // Verify each of the entries.
        let context = {
            dir: dir,
            relFilesOnDisk: relFilesOnDisk,
            expectedPackageName: expectedPackageName,
            untrustedIdentity: identity,
            untrustedPackageVersion: untrustedPackageVersion,
            isPrivate: isPrivate,
        };
        for (let entry of signature.entries) {
            let entryResult = await entry.verify(context);
            if (entryResult !== null) {
                return entryResult;
            }
        }

        // Request the verifier verify the signature.
        if (!await verifier.verify(identity, signature.signature, deterministicString)) {
            return {
                status: ModuleVerificationStatus.Compromised,
                reason: 'The signature does not match',
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
                untrustedIdentity: identity,
            };
        }

        // Check the package name in package.json matches the expected
        // package name that was provided.
        let packageInfo: any = null;
        try {
            packageInfo = JSON.parse(await readFilePromise(path.join(dir, 'package.json')));
        } catch (e) {
            return {
                status: ModuleVerificationStatus.Compromised,
                reason: 'Missing or unparsable package.json',
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
                untrustedIdentity: identity,
            };
        }

        if (packageInfo == null || (packageInfo.name || '') != expectedPackageName) {
            return {
                status: ModuleVerificationStatus.Compromised,
                reason: 'Provided package name in package.json did not match expected package name',
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
                untrustedIdentity: identity,
            };
        }

        // Package signature is valid, now we need to see if the identity
        // is trusted for the given package name.
        if (await this.trustStore.isTrusted(identity, expectedPackageName)) {
            return {
                status: ModuleVerificationStatus.Trusted,
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
                trustedIdentity: identity,
            };
        } else {
            return {
                status: ModuleVerificationStatus.Untrusted,
                untrustedIdentity: identity,
                packageName: expectedPackageName,
                untrustedPackageVersion: untrustedPackageVersion,
                isPrivate: isPrivate,
            }
        }
    }
}