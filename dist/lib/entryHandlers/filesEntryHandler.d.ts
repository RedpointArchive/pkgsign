import { IEntryHandler } from ".";
interface FileEntry {
    path: string;
    sha512: string;
}
interface FilesEntry {
    files: FileEntry[];
}
export declare const FilesEntryHandler: IEntryHandler<FilesEntry>;
export {};
