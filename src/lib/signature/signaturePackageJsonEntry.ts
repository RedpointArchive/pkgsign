import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult, ModuleVerificationStatus } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";
import { stringifySync } from 'json-normalize';
import * as fs from 'fs';
import * as path from 'path';

const generatedNpmKeys = [
    '_from',
    '_id',
    '_inBundle',
    '_integrity',
    '_location',
    '_phantomChildren',
    '_requested',
    '_requiredBy',
    '_resolved',
    '_shasum',
    '_spec',
    '_where',
];

/**
 * Used as the replacer for JSON stringify where it filters out any NPM injected
 * package.json keys.
 * 
 * @param key The key of the JSON property.
 * @param value The value of the JSON property.
 */
export const stripNpmMetadataFieldFromPackageInfo = (packageInfo: any) => {
    for (let key of Object.keys(packageInfo)) {
        if (generatedNpmKeys.indexOf(key) !== -1) {
            delete packageInfo[key];
        }
    }
}

export interface SignaturePackageJsonEntryData {
    packageJson: any;
}

export class SignaturePackageJsonEntry implements SignatureEntry {
    public entry: string = "packageJson/v1alpha1";
    public packageJson: any;

    constructor(raw: SignaturePackageJsonEntryData) {
        this.packageJson = raw.packageJson;

        // Strip NPM metadata from packageJson value.
        stripNpmMetadataFieldFromPackageInfo(this.packageJson);
    }

    public toDeterministicString() {
        return stringifySync(this.packageJson);
    }
    
    async verify(context: VerificationContext): Promise<ModuleVerificationResult | null> {
        if (this.packageJson == null) {
            // Verify that package.json does not exist on disk.
            if (context.relFilesOnDisk.indexOf('package.json') !== -1) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'package.json exists in the package, but was not in the signature',
                    packageName: context.expectedPackageName,
                    untrustedIdentity: context.untrustedIdentity,
                    untrustedPackageVersion: context.untrustedPackageVersion,
                    isPrivate: context.isPrivate,
                };
            }
        } else {
            // Verify that package.json does exist on disk.
            if (context.relFilesOnDisk.indexOf('package.json') === -1) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'package.json does not exist in the package, but was present in the signature',
                    packageName: context.expectedPackageName,
                    untrustedIdentity: context.untrustedIdentity,
                    untrustedPackageVersion: context.untrustedPackageVersion,
                    isPrivate: context.isPrivate,
                };
            }

            // Try to read the contents of package.json.
            const packageJsonRaw = fs.readFileSync(path.join(context.dir, 'package.json'), 'utf8');
            let packageJsonActual;
            try {
                packageJsonActual = JSON.parse(packageJsonRaw);
            } catch (e) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'package.json does not contain valid JSON',
                    packageName: context.expectedPackageName,
                    untrustedIdentity: context.untrustedIdentity,
                    untrustedPackageVersion: context.untrustedPackageVersion,
                    isPrivate: context.isPrivate,
                };
            }

            // Strip NPM metadata from actual package.json value.
            stripNpmMetadataFieldFromPackageInfo(packageJsonActual);

            // Stringify both our expected and actual values.
            const normalizedActual = stringifySync(packageJsonActual);
            const normalizedExpected = stringifySync(this.packageJson);

            // If they don't match, then package.json doesn't match the expected value.
            if (normalizedActual !== normalizedExpected) {
                return {
                    status: ModuleVerificationStatus.Compromised,
                    reason: 'package.json on disk does not match the signed package.json',
                    packageName: context.expectedPackageName,
                    untrustedIdentity: context.untrustedIdentity,
                    untrustedPackageVersion: context.untrustedPackageVersion,
                    isPrivate: context.isPrivate,
                };
            }
        }

        // No invalidation of signature.
        return null;
    }

    getIdentity(): SignatureIdentity | null {
        return null;
    }
}