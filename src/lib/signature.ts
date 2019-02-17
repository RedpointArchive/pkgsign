import { SignatureFilesEntry, SignatureFilesEntryData } from "./signature/signatureFilesEntry";
import { SignatureIdentityEntry, SignatureIdentityEntryData } from "./signature/signatureIdentityEntry";
import { LegacySignatureInfo } from "./signature/legacySignatureInfo";
import { VerificationContext } from "./signature/verificationContext";
import { ModuleVerificationResult } from "./moduleVerifier";
import { SignatureIdentity } from "./signature/signatureIdentity";
import { SignaturePackageJsonEntry, SignaturePackageJsonEntryData } from "./signature/signaturePackageJsonEntry";
import { SignatureNpmCompatiblePackageJsonEntry, SignatureNpmCompatiblePackageJsonEntryData } from "./signature/signatureNpmCompatiblePackageJsonEntry";

export interface SignatureInfo {
    entries: SignatureEntry[];
    signature: string;
    isLegacySignature?: boolean;
}

export interface SignatureEntry {
    entry: string;
    toDeterministicString(): string;
    verify(context: VerificationContext): Promise<ModuleVerificationResult | null>;
    getIdentity(): SignatureIdentity | null;
}

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
    '_optional',
    '_development',
    '_args'
];

export class SignatureParser {
    public parse(packageName: string, packageJson: object | null, signatureJson: string): SignatureInfo {
        let obj = JSON.parse(signatureJson);

        // Check for legacy signature we need to convert.
        if (obj.version !== undefined && obj.version === 'v1alpha') {
            let legacyObj = obj as LegacySignatureInfo;
            let newObj: SignatureInfo = {
                entries: [
                    new SignatureFilesEntry({
                        files: legacyObj.files,
                    }),
                    new SignatureIdentityEntry({
                        identity: legacyObj.identity,
                    }),
                ],
                signature: legacyObj.signature,
                isLegacySignature: true,
            };
            obj = newObj;
        } else {
            // Prevent someone setting isLegacySignature in signature.json 
            // in an effort to manipulate signature verification on newer
            // formats.
            let newObj = obj as SignatureInfo;
            if (newObj.isLegacySignature !== undefined) {
                delete newObj.isLegacySignature;
            }

            // Upgrade the entries to the actual TypeScript classes.
            let rawEntries = newObj.entries;
            newObj.entries = [];
            const npmUsed = this.isPackageInstalledWithNpm(packageJson) || this.isPackagePublishedWithNpm(packageJson);
            const npmCompatibleCheck = rawEntries.some((entry) => entry.entry === "npmCompatiblePackageJson/v1alpha1");
            for (let i = 0; i < rawEntries.length; i++) {
                let instance: SignatureEntry | null = null;
                switch (rawEntries[i].entry) {
                    case "files/v1alpha1":
                        instance = new SignatureFilesEntry(rawEntries[i] as any as SignatureFilesEntryData);
                        break;
                    case "identity/v1alpha1":
                        instance = new SignatureIdentityEntry(rawEntries[i] as any as SignatureIdentityEntryData);
                        break;
                    case "packageJson/v1alpha1":
                        if (npmUsed && npmCompatibleCheck) {
                            console.warn(`WARNING: package '${packageName}' is either published and/or installed with npm - performing npm compatible package.json verification`);
                            continue;
                        } else {
                            instance = new SignaturePackageJsonEntry(rawEntries[i] as any as SignaturePackageJsonEntryData);
                        }
                        break;
                    case "npmCompatiblePackageJson/v1alpha1":
                        instance = new SignatureNpmCompatiblePackageJsonEntry(rawEntries[i] as any as SignatureNpmCompatiblePackageJsonEntryData);
                        break;
                }
                if (instance === null) {
                    throw new Error('unsupported entry type: ' + rawEntries[i].entry + ', try upgrading pkgsign');
                }
                newObj.entries.push(instance);
            }
        }
        
        return obj as SignatureInfo;
    }

    private isPackageInstalledWithNpm(packageJson: object | null): boolean {
        if (packageJson) {
            // if some of the npm generated keys are in the package.json of the installed
            // package, we can assume npm was used for installing the package
            return Object.keys(packageJson)
                .some((property) => generatedNpmKeys.indexOf(property) >= 0);
        }
        // can't assume the package was installed with npm - verification would fail if so
        return false;
    }
    
    private isPackagePublishedWithNpm(packageJson: object | null): boolean {
        if (packageJson) {
            // at least gitHead is added to package.json when publishing with npm
            return Object.keys(packageJson).sort().indexOf('gitHead') >= 0;
        }
        // can't assume the package was published with npm - verification would fail if so
        return false;
    }
}

export function createDeterministicString(signature: SignatureInfo) {
    if (signature.isLegacySignature) {
        // Compatibility with v1alpha.
        let filesEntry: SignatureFilesEntry | null = null;
        for (let entry of signature.entries) {
            if (entry.entry === 'files/v1alpha1') {
                filesEntry = entry as SignatureFilesEntry;
                break;
            }
        }
        if (filesEntry === null) {
            throw new Error('expected legacy signature to contain files/v1alpha1, but it was missing');
        }
        return filesEntry.toDeterministicString();
    } else {
        let deterministicString = '';
        for (let entry of signature.entries) {
            deterministicString += entry.entry + '\n';
            deterministicString += entry.toDeterministicString().trim() + '\n';
        }
        return deterministicString.trim();
    }
}