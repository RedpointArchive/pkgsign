"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const fsPromise_1 = require("./util/fsPromise");
class TrustStore {
    constructor() { }
    getOrFetchCachedPublicKeys(cacheName, fetch) {
        return __awaiter(this, void 0, void 0, function* () {
            const trustStoreFolder = this.createTrustStoreIfNecessary();
            const cacheFilename = path.join(trustStoreFolder, cacheName + ".cache");
            try {
                const cachedData = JSON.parse(yield fsPromise_1.readFilePromise(cacheFilename));
                if (cachedData.expiryUtc > Math.floor(Date.now() / 1000)) {
                    // cache still valid.
                    return cachedData.data;
                }
                else {
                    throw new Error("cache expired");
                }
            }
            catch (e) {
                const result = yield fetch();
                yield fsPromise_1.writeFilePromise(cacheFilename, JSON.stringify({
                    data: result,
                    expiryUtc: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
                }));
                return result;
            }
        });
    }
    fetchCachedPublicKeys(cacheName, fetch) {
        return __awaiter(this, void 0, void 0, function* () {
            const trustStoreFolder = this.createTrustStoreIfNecessary();
            const cacheFilename = path.join(trustStoreFolder, cacheName + ".cache");
            const result = yield fetch();
            yield fsPromise_1.writeFilePromise(cacheFilename, JSON.stringify({
                data: result,
                expiryUtc: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
            }));
            return result;
        });
    }
    isTrusted(identity, packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            const trustStoreFolder = this.createTrustStoreIfNecessary();
            const packageFilename = path.join(trustStoreFolder, packageName + ".trust");
            try {
                const trustInfo = JSON.parse(yield fsPromise_1.readFilePromise(packageFilename));
                return (trustInfo.keybaseUser === identity.keybaseUser &&
                    trustInfo.pgpPublicKeyUrl === identity.pgpPublicKeyUrl);
            }
            catch (e) {
                return false;
            }
        });
    }
    addTrusted(identity, packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            const trustStoreFolder = this.createTrustStoreIfNecessary();
            const packageFilename = path.join(trustStoreFolder, packageName + ".trust");
            yield fsPromise_1.writeFilePromise(packageFilename, JSON.stringify(identity));
        });
    }
    createTrustStoreIfNecessary() {
        const isWin = /^win/.test(process.platform);
        const trustStoreBaseFolder = isWin
            ? process.env.USERPROFILE
            : process.env.HOME;
        if (trustStoreBaseFolder === undefined) {
            throw new Error("missing HOME / USERPROFILE environment variable; can not determine location of trust store");
        }
        const trustStoreFolder = path.join(trustStoreBaseFolder, ".pkgsign-trust-store");
        if (!fs.existsSync(trustStoreFolder)) {
            fs.mkdirSync(trustStoreFolder);
        }
        return trustStoreFolder;
    }
}
exports.TrustStore = TrustStore;
class TestTrustStore {
    constructor() { }
    getOrFetchCachedPublicKeys(cacheName, fetch) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield fsPromise_1.readFilePromise(path.join(__dirname, "..", "..", "test", "test.pub"));
        });
    }
    fetchCachedPublicKeys(cacheName, fetch) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield fsPromise_1.readFilePromise(path.join(__dirname, "..", "..", "test", "test.pub"));
        });
    }
    isTrusted(identity, packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            return (identity.pgpPublicKeyUrl === "https://pkgsign.test.invalid.url/test.pub");
        });
    }
    addTrusted(identity, packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            // No implementation.
        });
    }
}
exports.TestTrustStore = TestTrustStore;
//# sourceMappingURL=trustStore.js.map