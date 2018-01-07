import { SignatureIdentity } from "./deterministicSignature";
export declare class TrustStore {
    constructor();
    getOrFetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    fetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean>;
    addTrusted(identity: SignatureIdentity, packageName: string): Promise<void>;
    private createTrustStoreIfNecessary();
}
