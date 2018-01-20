export interface VerificationContext {
    // The directory of the module being verified.
    dir: string;

    // A list of relative file paths expected on disk for this module.
    relFilesOnDisk: string[];

    // The expected package name.
    expectedPackageName: string;
}