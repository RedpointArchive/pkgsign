import { SignatureInfo, SignatureIdentity, createSignatureFromEntries } from "./deterministicSignature";
import { readFilePromise, sha512OfFile } from "./fsPromise";
import * as path from 'path';
import { TrustStore } from "./trustStore";
import { Verifier } from "./verifier";
import { KeybaseVerifier } from "./keybaseVerifier";
import { PgpVerifier } from "./pgpVerifier";

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
    reason?: string;
    untrustedIdentity?: SignatureIdentity;
}

export class ModuleVerifier {
    constructor(private trustStore: TrustStore) { }

    public async verify(dir: string, relFilesOnDisk: string[], expectedPackageName: string): Promise<ModuleVerificationResult> {
        // Load the signature document.
        let signature: SignatureInfo | null = null;
        try {
            signature = JSON.parse(await readFilePromise(path.join(dir, 'signature.json'))) as SignatureInfo;
        } catch (e) {
            return {
                status: ModuleVerificationStatus.Unsigned,
                reason: 'Missing or unparsable signature.json'
            };
        }

        // Check that we have an expected signature version.
        if (signature.version != 'v1alpha') {
            return {
                status: ModuleVerificationStatus.Unsigned,
                reason: 'Unrecognised signature version ' + signature.version
            };
        }

        // For each relative file on disk, make sure it appears in
        // the list of files the signature is signing for.
        for (let relFileOnDisk of relFilesOnDisk) {
            let normalisedPath = relFileOnDisk.replace(/\\/g, '/');
            if (normalisedPath == 'signature.json') {
                continue;
            }

            let found = false;
            let expectedHash = null;
            for (let expectedFile of signature.files) {
                if (expectedFile.path == normalisedPath) {
                    found = true;
                    expectedHash = expectedFile.sha512;
                }
            }

            if (!found) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: normalisedPath + ' exists in the package, but was not in the signature'
                };
            }
            
            const hash = await sha512OfFile(path.join(dir, normalisedPath));
            if (hash != expectedHash) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: normalisedPath + ' does not have content that was signed for (mismatched hash)'
                };
            }
        }

        // For each file in the signature, make sure it appears in expected files.
        // We don't need to hash here because if there is a match we will have already
        // checked it in the for loop above.
        for (let fileEntry of signature.files) {
            if (fileEntry.path == 'signature.json') {
                continue;
            }

            let found = false;
            for (let relFileOnDisk of relFilesOnDisk) {
                let normalisedPath = relFileOnDisk.replace(/\\/g, '/');
                if (normalisedPath == fileEntry.path) {
                    found = true;
                }
            }

            if (!found) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: fileEntry.path + ' is expected by the signature, but is missing in the package'
                };
            }
        }
        
        // Build up our deterministic string to validate the signature against.
        const deterministicSignature = createSignatureFromEntries(signature.files);

        // Now we know the package contents matches the files expected by the signature, and all
        // of the hashes match, but now we need to locate the public keys for the signature so
        // we can verify it.
        let verifier: Verifier;
        if (signature.identity.keybaseUser !== undefined) {
            verifier = new KeybaseVerifier();
        } else if (signature.identity.pgpPublicKeyUrl !== undefined) {
            verifier = new PgpVerifier();
        }

        // Request the verifier verify the signature.
        if (!await verifier.verify(signature.identity, signature.signature, deterministicSignature)) {
            return {
                status: ModuleVerificationStatus.Compromised,
                reason: 'The signature does not match'
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
                reason: 'Missing or unparsable package.json'
            };
        }

        if (packageInfo == null || packageInfo.name != expectedPackageName) {
            return {
                status: ModuleVerificationStatus.Compromised,
                reason: 'Provided package name in package.json did not match expected package name'
            };
        }

        // Package signature is valid, now we need to see if the identity
        // is trusted for the given package name.
        if (await this.trustStore.isTrusted(signature.identity, expectedPackageName)) {
            return {
                status: ModuleVerificationStatus.Trusted,
            };
        } else {
            return {
                status: ModuleVerificationStatus.Untrusted,
                untrustedIdentity: signature.identity,
            }
        }
    }
}