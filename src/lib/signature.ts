import { SignatureFilesEntry, SignatureFilesEntryData } from "./signature/signatureFilesEntry";
import { SignatureIdentityEntry, SignatureIdentityEntryData } from "./signature/signatureIdentityEntry";
import { LegacySignatureInfo } from "./signature/legacySignatureInfo";
import { VerificationContext } from "./signature/verificationContext";
import { ModuleVerificationResult } from "./moduleVerifier";
import { SignatureIdentity } from "./signature/signatureIdentity";
import { SignaturePackageJsonEntry, SignaturePackageJsonEntryData } from "./signature/signaturePackageJsonEntry";
import { SignaturePackageJsonPropertiesEntry, SignaturePackageJsonPropertiesEntryData } from "./signature/signaturePackageJsonPropertiesEntry";

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

export class SignatureParser {
    public parse(json: string): SignatureInfo {
        let obj = JSON.parse(json);

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
                        instance = new SignaturePackageJsonEntry(rawEntries[i] as any as SignaturePackageJsonEntryData);
                        break;
                    case "packageJson/v1alpha2":
                        instance = new SignaturePackageJsonPropertiesEntry(rawEntries[i] as any as SignaturePackageJsonPropertiesEntryData);
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