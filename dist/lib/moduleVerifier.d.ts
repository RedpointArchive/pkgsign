import { ITrustStore } from "./trustStore";
import { ModuleVerificationResult } from "./types";
export declare class ModuleVerifier {
    private trustStore;
    constructor(trustStore: ITrustStore);
    verify(dir: string, relFilesOnDisk: string[], expectedPackageName: string): Promise<ModuleVerificationResult>;
}
