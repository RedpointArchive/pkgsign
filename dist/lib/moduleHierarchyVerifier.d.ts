import { ITrustStore } from "./trustStore";
import { ModuleVerificationResult } from "./types";
export interface ModuleInfo {
    untrustedPackageInfo: any;
    path: string;
}
export declare class ModuleHierarchyVerifier {
    private dir;
    private trustStore;
    constructor(dir: string, trustStore: ITrustStore);
    verify(): Promise<{
        [path: string]: ModuleVerificationResult;
    }>;
    private findModules;
}
