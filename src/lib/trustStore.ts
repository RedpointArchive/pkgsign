import * as path from 'path';
import * as fs from 'fs';
import { readFilePromise, writeFilePromise } from "./fsPromise";
import { SignatureIdentity } from './signature/signatureIdentity';

interface CachedData {
    data: string;
    expiryUtc: number;
}

export interface ITrustStore {
    getOrFetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    fetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string>;
    isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean>;
    addTrusted(identity: SignatureIdentity, packageName: string): Promise<void>;
}

export class TrustStore implements ITrustStore {
    constructor() { }

    public async getOrFetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string> {
        const trustStoreFolder = this.createTrustStoreIfNecessary();
        const cacheFilename = path.join(trustStoreFolder, cacheName + '.cache');

        try {
            const cachedData = JSON.parse(await readFilePromise(cacheFilename)) as CachedData;
            if (cachedData.expiryUtc > Math.floor(Date.now() / 1000)) {
                // cache still valid.
                return cachedData.data;
            } else {
                throw new Error('cache expired');
            }
        } catch (e) {
            const result = await fetch();
            await writeFilePromise(cacheFilename, JSON.stringify({
                data: result,
                expiryUtc: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
            }));
            return result;
        }
    }

    public async fetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string> {
        const trustStoreFolder = this.createTrustStoreIfNecessary();
        const cacheFilename = path.join(trustStoreFolder, cacheName + '.cache');

        const result = await fetch();
        await writeFilePromise(cacheFilename, JSON.stringify({
            data: result,
            expiryUtc: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
        }));
        return result;
    }

    public async isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean> {
        const trustStoreFolder = this.createTrustStoreIfNecessary();
        const packageFilename = path.join(trustStoreFolder, packageName + '.trust');

        try {
            const trustInfo = JSON.parse(await readFilePromise(packageFilename)) as SignatureIdentity;
            return trustInfo.keybaseUser === identity.keybaseUser && trustInfo.pgpPublicKeyUrl === identity.pgpPublicKeyUrl;
        } catch (e) {
            return false;
        }
    }

    public async addTrusted(identity: SignatureIdentity, packageName: string): Promise<void> {
        const trustStoreFolder = this.createTrustStoreIfNecessary();
        const packageFilename = path.join(trustStoreFolder, packageName + '.trust');

        await writeFilePromise(packageFilename, JSON.stringify(identity));
    }

    private createTrustStoreIfNecessary(): string {
        const isWin = /^win/.test(process.platform);
        const trustStoreBaseFolder = isWin ? process.env.USERPROFILE : process.env.HOME;
        const trustStoreFolder = path.join(trustStoreBaseFolder, '.pkgsign-trust-store');

        if (!fs.existsSync(trustStoreFolder)) {
            fs.mkdirSync(trustStoreFolder);
        }

        return trustStoreFolder;
    }
}

export class TestTrustStore implements ITrustStore {
    constructor() { }

    public async getOrFetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string> {
        return await readFilePromise(path.join(__dirname, '..', '..', 'test', 'test.pub'));
    }

    public async fetchCachedPublicKeys(cacheName: string, fetch: () => Promise<string>): Promise<string> {
        return await readFilePromise(path.join(__dirname, '..', '..', 'test', 'test.pub'));
    }

    public async isTrusted(identity: SignatureIdentity, packageName: string): Promise<boolean> {
        return identity.pgpPublicKeyUrl === 'https://pkgsign.test.invalid.url/test.pub';
    }

    public async addTrusted(identity: SignatureIdentity, packageName: string): Promise<void> {
        // No implementation.
    }
}