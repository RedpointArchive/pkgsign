"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const clime_1 = require("clime");
const path = require("path");
const fs_1 = require("fs");
const packlist = require("npm-packlist");
const signature_1 = require("../lib/signature");
const telemetry_1 = require("../lib/telemetry");
const registry_1 = require("../lib/entryHandlers/registry");
const fsPromise_1 = require("../lib/util/fsPromise");
const pgp_1 = require("../lib/identity/pgp");
const keybase_1 = require("../lib/identity/keybase");
class SignOptions extends clime_1.Options {
    constructor() {
        super(...arguments);
        this.withSigner = "";
        this.privateKeyPath = "";
        this.privateKeyPassphrase = "";
        this.publicKeyUrl = "";
    }
}
__decorate([
    clime_1.option({
        name: "signer",
        description: "the signer to use, one of: 'keybase' (default) or 'pgp'",
        default: "keybase"
    }),
    __metadata("design:type", String)
], SignOptions.prototype, "withSigner", void 0);
__decorate([
    clime_1.option({
        name: "pgp-private-key-path",
        description: "when signing with 'pgp', this is the path to the private key file"
    }),
    __metadata("design:type", String)
], SignOptions.prototype, "privateKeyPath", void 0);
__decorate([
    clime_1.option({
        name: "pgp-private-key-passphrase",
        description: "when signing with 'pgp', this is the passphrase for the private key file"
    }),
    __metadata("design:type", String)
], SignOptions.prototype, "privateKeyPassphrase", void 0);
__decorate([
    clime_1.option({
        name: "pgp-public-key-https-url",
        description: "when signing with 'pgp', this is the HTTPS URL to the public key that pkgsign can download to verify the package"
    }),
    __metadata("design:type", String)
], SignOptions.prototype, "publicKeyUrl", void 0);
exports.SignOptions = SignOptions;
let default_1 = class default_1 extends clime_1.Command {
    execute(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.executeInternal(path, options)) {
                process.exitCode = 0;
            }
            else {
                process.exitCode = 1;
            }
        });
    }
    executeInternal(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let identityProvider;
            if (options.withSigner == "pgp") {
                identityProvider = pgp_1.PgpIdentityProvider;
            }
            else if (options.withSigner == "keybase") {
                identityProvider = keybase_1.KeybaseIdentityProvider;
            }
            else {
                throw new Error("Not supported signer type: " + options.withSigner);
            }
            const identityProviderSigningContext = {
                privateKeyPath: options.privateKeyPath,
                privateKeyPassphrase: options.privateKeyPassphrase,
                publicKeyHttpsUrl: options.publicKeyUrl
            };
            if (path.endsWith(".tgz") && fs_1.lstatSync(path).isFile()) {
                return yield this.signTarball(identityProvider, identityProviderSigningContext, path);
            }
            else {
                return yield this.signDirectory(identityProvider, identityProviderSigningContext, path);
            }
        });
    }
    signTarball(identityProvider, identityProviderSigningContext, tarballPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const wd = yield fsPromise_1.createWorkingDirectory();
            console.log("extracting unsigned tarball...");
            yield fsPromise_1.decompress(tarballPath, wd);
            console.log("building file list...");
            const base = path.join(wd, "package");
            let files = yield fsPromise_1.recursivePromise(base);
            files = files.map(fullPath => fullPath.substr(base.length + 1));
            yield this.signFileList(identityProvider, identityProviderSigningContext, base, files, "sign-tarball");
            yield fsPromise_1.unlinkPromise(tarballPath);
            yield fsPromise_1.compress(wd, tarballPath);
            console.log("package tarball has been signed");
            return true;
        });
    }
    signDirectory(identityProvider, identityProviderSigningContext, packagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("building file list...");
            const files = yield packlist({
                path: packagePath
            });
            yield this.signFileList(identityProvider, identityProviderSigningContext, packagePath, files, "sign-directory");
            console.log("signature.json has been created in package directory");
            return true;
        });
    }
    signFileList(identityProvider, identityProviderSigningContext, basePath, relativeFilePaths, telemetryAction) {
        return __awaiter(this, void 0, void 0, function* () {
            const identity = yield identityProvider.getIdentity(identityProviderSigningContext);
            const context = {
                dir: basePath,
                relFilesOnDisk: relativeFilePaths,
                signingIdentity: identity
            };
            let entries = [];
            for (const entryHandler of registry_1.availableEntryHandlers) {
                const entryValue = yield entryHandler.generateEntry(context);
                if (entryValue !== null) {
                    entries.push({
                        entry: entryHandler.getEntryType(),
                        value: entryValue
                    });
                }
            }
            yield telemetry_1.queueTelemetryPackageAction(context, identity, telemetryAction);
            const signatureDocumentJson = yield signature_1.createSignedSignatureDocument(entries, identityProvider, identityProviderSigningContext);
            yield fsPromise_1.writeFilePromise(path.join(basePath, "signature.json"), signatureDocumentJson);
        });
    }
};
__decorate([
    __param(0, clime_1.param({
        name: "pkgdir|tarball",
        description: "path to package directory or tarball",
        required: true
    })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SignOptions]),
    __metadata("design:returntype", Promise)
], default_1.prototype, "execute", null);
default_1 = __decorate([
    clime_1.command({
        description: "sign an npm/yarn package directory or tarball"
    })
], default_1);
exports.default = default_1;
//# sourceMappingURL=sign.js.map