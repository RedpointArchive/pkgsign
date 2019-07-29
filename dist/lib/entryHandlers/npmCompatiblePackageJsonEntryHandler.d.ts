import { IEntryHandler } from ".";
interface NpmCompatiblePackageJsonEntry {
    packageJsonProperties: Array<string>;
    sha512: string;
}
export declare const NpmCompatiblePackageJsonEntryHandler: IEntryHandler<NpmCompatiblePackageJsonEntry>;
export {};
