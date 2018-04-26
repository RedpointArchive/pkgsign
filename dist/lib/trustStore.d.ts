import { SignatureIdentity } from './signature/signatureIdentity';
export interface ITrustStore {
    getOrFetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    fetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean>;
    addTrusted(identity: SignatureIdentity, packageName: string): Promise<void>;
}
export declare class TrustStore implements ITrustStore {
    constructor();
    getOrFetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    fetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean>;
    addTrusted(identity: SignatureIdentity, packageName: string): Promise<void>;
    private createTrustStoreIfNecessary();
}
export declare class TestTrustStore implements ITrustStore {
    constructor();
    getOrFetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    fetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean>;
    addTrusted(identity: SignatureIdentity, packageName: string): Promise<void>;
}
