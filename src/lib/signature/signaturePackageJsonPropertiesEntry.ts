import { SignatureEntry } from "../signature";
import { VerificationContext } from "./verificationContext";
import { ModuleVerificationResult, ModuleVerificationStatus } from "../moduleVerifier";
import { SignatureIdentity } from "./signatureIdentity";
import { normalizeSync as stringifySync } from './jsonNormalize';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface SignaturePackageJsonPropertiesEntryData {
    readonly packageJsonProperties: Array<string>;
    readonly sha512: string;
}

export class SignaturePackageJsonPropertiesEntry implements SignatureEntry {

    public static async sha512OfObject(value: object, properties: Array<string>): Promise<string> {
        const orderedObject = {};
        properties
            // filter properties starting with underscore
            .filter((key) => key.indexOf('_') != 0)
            .sort()
            .forEach((key) => orderedObject[key] = value[key]);

        const hash = createHash('sha512');
        hash.update(stringifySync(orderedObject));
        const hashStr = hash.digest('hex');

        return hashStr;
    }

    public readonly entry: string = "packageJson/v1alpha2";
    public readonly packageJsonProperties: Array<string>;
    public readonly sha512: string;

    constructor(raw: SignaturePackageJsonPropertiesEntryData) {
        this.sha512 = raw.sha512;
        this.packageJsonProperties = raw.packageJsonProperties;
        if (this.packageJsonProperties) {
            this.packageJsonProperties = this.packageJsonProperties
                // exclude _XXX properties
                .filter((value) => value.indexOf('_') != 0)
                .sort();
        }
    }

    public toDeterministicString() {
        return stringifySync(this.packageJsonProperties) + '\n' + this.sha512;
    }
    
    async verify(context: VerificationContext): Promise<ModuleVerificationResult | null> {
        if (!this.packageJsonProperties) {
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

            const hash = await SignaturePackageJsonPropertiesEntry.sha512OfObject(packageJsonActual, this.packageJsonProperties);
            if (hash != this.sha512) {
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
