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
const fsPromise_1 = require("../lib/fsPromise");
const keybaseSigner_1 = require("../lib/keybaseSigner");
const pgpSigner_1 = require("../lib/pgpSigner");
const packlist = require("npm-packlist");
const signatureFilesEntry_1 = require("../lib/signature/signatureFilesEntry");
const signature_1 = require("../lib/signature");
const signatureIdentityEntry_1 = require("../lib/signature/signatureIdentityEntry");
const telemetry_1 = require("../lib/telemetry");
const signatureIdentity_1 = require("../lib/signature/signatureIdentity");
const signaturePackageJsonEntry_1 = require("../lib/signature/signaturePackageJsonEntry");
class SignOptions extends clime_1.Options {
}
__decorate([
    clime_1.option({
        name: 'signer',
        description: 'the signer to use, one of: \'keybase\' (default) or \'pgp\'',
        default: 'keybase',
    }),
    __metadata("design:type", String)
], SignOptions.prototype, "withSigner", void 0);
__decorate([
    clime_1.option({
        name: 'pgp-private-key-path',
        description: 'when signing with \'pgp\', this is the path to the private key file',
    }),
    __metadata("design:type", String)
], SignOptions.prototype, "privateKeyPath", void 0);
__decorate([
    clime_1.option({
        name: 'pgp-private-key-passphrase',
        description: 'when signing with \'pgp\', this is the passphrase for the private key file',
    }),
    __metadata("design:type", String)
], SignOptions.prototype, "privateKeyPassphrase", void 0);
__decorate([
    clime_1.option({
        name: 'pgp-public-key-https-url',
        description: 'when signing with \'pgp\', this is the HTTPS URL to the public key that pkgsign can download to verify the package',
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
            let signer;
            if (options.withSigner == 'pgp') {
                signer = new pgpSigner_1.PgpSigner(options.privateKeyPath, options.privateKeyPassphrase, options.publicKeyUrl);
            }
            else if (options.withSigner == 'keybase') {
                signer = new keybaseSigner_1.KeybaseSigner();
            }
            else {
                throw new Error('Not supported signer type: ' + options.withSigner);
            }
            if (path.endsWith(".tgz") && fs_1.lstatSync(path).isFile()) {
                return yield this.signTarball(signer, path);
            }
            else {
                return yield this.signDirectory(signer, path);
            }
        });
    }
    signTarball(signer, tarballPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const wd = yield fsPromise_1.createWorkingDirectory();
            console.log('extracting unsigned tarball...');
            yield fsPromise_1.decompress(tarballPath, wd);
            console.log('building file list...');
            const base = path.join(wd, "package");
            let files = yield fsPromise_1.recursivePromise(base);
            files = files.map(fullPath => fullPath.substr(base.length + 1));
            yield this.signFileList(signer, base, files, 'sign-tarball');
            yield fsPromise_1.unlinkPromise(tarballPath);
            yield fsPromise_1.compress(wd, tarballPath);
            console.log('package tarball has been signed');
            return true;
        });
    }
    signDirectory(signer, packagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('building file list...');
            const files = yield packlist({
                path: packagePath
            });
            yield this.signFileList(signer, packagePath, files, 'sign-directory');
            console.log('signature.json has been created in package directory');
            return true;
        });
    }
    signFileList(signer, basePath, relativeFilePaths, telemetryAction) {
        return __awaiter(this, void 0, void 0, function* () {
            let packageInfo = null;
            let entries = [];
            for (let relPath of relativeFilePaths) {
                const normalisedPath = relPath.replace(/\\/g, '/');
                if (normalisedPath == 'signature.json') {
                    // This file might be included in the Git repo to sign the contents of the
                    // latest commit against Keybase or PGP, but it should never be included
                    // in the signature (because we're about to replace it in the signed package
                    // anyway).
                    continue;
                }
                if (normalisedPath == 'package.json') {
                    // This file will be included in it's own package entry.
                    const packageJson = yield fsPromise_1.readFilePromise(path.join(basePath, relPath));
                    try {
                        packageInfo = JSON.parse(packageJson);
                        // Strip NPM metadata from package.json.
                        // REMOVAL: stripNpmMetadataFieldFromPackageInfo(packageInfo);
                        continue;
                    }
                    catch (e) {
                        console.warn('unable to parse package.json as JSON for signing');
                        packageInfo = undefined; /* do not include package json signature entry, so file validation will fallback to exact match */
                    }
                }
                const hash = yield fsPromise_1.sha512OfFile(path.join(basePath, relPath));
                entries.push({
                    path: normalisedPath,
                    sha512: hash,
                });
            }
            console.log('obtaining identity...');
            const identity = yield signer.getIdentity();
            // Queue telemetry if needed.
            if (packageInfo != null && packageInfo.name != undefined) {
                if (packageInfo.private != true) {
                    // This is not a private package, so record telemetry with the package
                    // name included.
                    yield telemetry_1.queueTelemetry({
                        action: telemetryAction,
                        packageName: packageInfo.name,
                        packageVersion: packageInfo.version || '',
                        packageIsSigned: true,
                        signingIdentity: signatureIdentity_1.identityToString(identity),
                        identityIsTrusted: true,
                    });
                }
                else {
                    // Private package, don't include any package information.
                    yield telemetry_1.queueTelemetry({
                        action: telemetryAction,
                        packageName: '',
                        packageVersion: '',
                        packageIsSigned: true,
                        signingIdentity: '',
                        identityIsTrusted: true,
                    });
                }
            }
            else {
                // Can't read package.json or it doesn't exist - don't include
                // any package information.
                yield telemetry_1.queueTelemetry({
                    action: telemetryAction,
                    packageName: '',
                    packageVersion: '',
                    packageIsSigned: true,
                    signingIdentity: '',
                    identityIsTrusted: true,
                });
            }
            console.log('creating signature...');
            const signatureDocument = {
                entries: [
                    new signatureFilesEntry_1.SignatureFilesEntry({
                        files: entries,
                    }),
                    new signatureIdentityEntry_1.SignatureIdentityEntry({
                        identity: identity,
                    }),
                    ...(packageInfo === undefined ? [] : [
                        new signaturePackageJsonEntry_1.SignaturePackageJsonPropertiesEntry({
                            packageJsonProperties: Object.keys(packageInfo).sort(),
                            sha512: yield signaturePackageJsonEntry_1.SignaturePackageJsonPropertiesEntry.sha512OfObject(packageInfo, Object.keys(packageInfo))
                        })
                    ]),
                ],
                signature: '',
            };
            console.log('creating deterministic string...');
            const deterministicString = signature_1.createDeterministicString(signatureDocument);
            console.log('signing deterministic string...');
            signatureDocument.signature = yield signer.signEntries(deterministicString);
            const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
            yield fsPromise_1.writeFilePromise(path.join(basePath, 'signature.json'), signatureDocumentJson);
        });
    }
};
__decorate([
    __param(0, clime_1.param({
        name: 'pkgdir|tarball',
        description: 'path to package directory or tarball',
        required: true,
    })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SignOptions]),
    __metadata("design:returntype", Promise)
], default_1.prototype, "execute", null);
default_1 = __decorate([
    clime_1.command({
        description: 'sign an npm/yarn package directory or tarball',
    })
], default_1);
exports.default = default_1;
//# sourceMappingURL=sign.js.map