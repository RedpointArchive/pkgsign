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
                yield this.signTarball(signer, path);
            }
            else {
                yield this.signDirectory(signer, path);
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
            const files = yield fsPromise_1.recursivePromise(base);
            let entries = [];
            for (let fullPath of files) {
                const hash = yield fsPromise_1.sha512OfFile(fullPath);
                const normalisedPath = fullPath.substr(base.length + 1).replace(/\\/g, '/');
                if (normalisedPath == 'signature.json') {
                    // This file might be included in the Git repo to sign the contents of the
                    // latest commit against Keybase or PGP, but it should never be included
                    // in the signature (because we're about to replace it in the signed package
                    // anyway).
                    continue;
                }
                entries.push({
                    path: normalisedPath,
                    sha512: hash,
                });
            }
            console.log('obtaining identity...');
            const identity = yield signer.getIdentity();
            console.log('creating signature...');
            const signatureDocument = {
                entries: [
                    new signatureFilesEntry_1.SignatureFilesEntry({
                        files: entries,
                    }),
                    new signatureIdentityEntry_1.SignatureIdentityEntry({
                        identity: identity,
                    })
                ],
                signature: '',
            };
            console.log('creating deterministic string...');
            const deterministicString = signature_1.createDeterministicString(signatureDocument);
            console.log('signing deterministic string...');
            signatureDocument.signature = yield signer.signEntries(deterministicString);
            const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
            yield fsPromise_1.writeFilePromise(path.join(wd, 'package', 'signature.json'), signatureDocumentJson);
            yield fsPromise_1.unlinkPromise(tarballPath);
            yield fsPromise_1.compress(wd, tarballPath);
            console.log('package tarball has been signed');
        });
    }
    signDirectory(signer, packagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('building file list...');
            const files = yield packlist({
                path: packagePath
            });
            let entries = [];
            for (let relPath of files) {
                const hash = yield fsPromise_1.sha512OfFile(path.join(packagePath, relPath));
                const normalisedPath = relPath.replace(/\\/g, '/');
                if (normalisedPath == 'signature.json') {
                    // This file might be included in the Git repo to sign the contents of the
                    // latest commit against Keybase or PGP, but it should never be included
                    // in the signature (because we're about to replace it in the signed package
                    // anyway).
                    continue;
                }
                entries.push({
                    path: normalisedPath,
                    sha512: hash,
                });
            }
            console.log('obtaining identity...');
            const identity = yield signer.getIdentity();
            console.log('creating signature...');
            const signatureDocument = {
                entries: [
                    new signatureFilesEntry_1.SignatureFilesEntry({
                        files: entries,
                    }),
                    new signatureIdentityEntry_1.SignatureIdentityEntry({
                        identity: identity,
                    })
                ],
                signature: '',
            };
            console.log('creating deterministic string...');
            const deterministicString = signature_1.createDeterministicString(signatureDocument);
            console.log('signing deterministic string...');
            signatureDocument.signature = yield signer.signEntries(deterministicString);
            const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
            yield fsPromise_1.writeFilePromise(path.join(packagePath, 'signature.json'), signatureDocumentJson);
            console.log('signature.json has been created in package directory');
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