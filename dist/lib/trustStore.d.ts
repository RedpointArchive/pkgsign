import { SignatureIdentity } from "./deterministicSignature";
export declare class TrustStore {
    constructor();
    isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean>;
    addTrusted(identity: SignatureIdentity, packageName: string): Promise<void>;
    private createTrustStoreIfNecessary();
}
