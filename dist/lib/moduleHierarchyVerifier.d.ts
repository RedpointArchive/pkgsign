import { ModuleVerificationResult } from './moduleVerifier';
export interface ModuleInfo {
    untrustedPackageInfo: any;
    path: string;
}
export declare class ModuleHierarchyVerifier {
    private dir;
    constructor(dir: string);
    verify(): Promise<{
        [path: string]: ModuleVerificationResult;
    }>;
    private findModules(dir);
}
