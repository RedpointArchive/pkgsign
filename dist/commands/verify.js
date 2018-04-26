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
const fs_1 = require("fs");
const moduleHierarchyVerifier_1 = require("../lib/moduleHierarchyVerifier");
const moduleVerifier_1 = require("../lib/moduleVerifier");
const inquirer = require("inquirer");
const path = require("path");
const path_1 = require("path");
const trustStore_1 = require("../lib/trustStore");
const fsPromise_1 = require("../lib/fsPromise");
const telemetry_1 = require("../lib/telemetry");
const signatureIdentity_1 = require("../lib/signature/signatureIdentity");
class VerifyOptions extends clime_1.Options {
}
__decorate([
    clime_1.option({
        name: 'full',
        toggle: true,
        description: 'show verification status of individual packages',
    }),
    __metadata("design:type", Boolean)
], VerifyOptions.prototype, "full", void 0);
__decorate([
    clime_1.option({
        name: 'non-interactive',
        toggle: true,
        description: 'do not prompt to trust packages that are untrusted',
    }),
    __metadata("design:type", Boolean)
], VerifyOptions.prototype, "nonInteractive", void 0);
__decorate([
    clime_1.option({
        name: 'package-name',
        description: 'if verifying a tarball, this is the expected package name',
    }),
    __metadata("design:type", String)
], VerifyOptions.prototype, "packageName", void 0);
__decorate([
    clime_1.option({
        name: 'enable-test-trust-store',
        toggle: true,
        description: 'enables the test trust store, for debugging purposes only',
    }),
    __metadata("design:type", Boolean)
], VerifyOptions.prototype, "enableTestTrustStore", void 0);
exports.VerifyOptions = VerifyOptions;
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
            if (path === undefined) {
                // Default path to the current directory if not provided.
                path = '.';
            }
            if (path.endsWith(".tgz") && fs_1.lstatSync(path).isFile()) {
                return yield this.verifyTarball(path, options);
            }
            else {
                return yield this.verifyDirectory(path, options);
            }
        });
    }
    verifyTarball(tarballPath, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const wd = yield fsPromise_1.createWorkingDirectory();
            console.log('extracting unsigned tarball...');
            yield fsPromise_1.decompress(tarballPath, wd);
            console.log('building file list...');
            const base = path.join(wd, "package");
            const files = (yield fsPromise_1.recursivePromise(base)).map((fullPath) => fullPath.substr(base.length + 1).replace(/\\/g, '/'));
            console.log('verifying package...');
            const moduleVerifier = new moduleVerifier_1.ModuleVerifier(options.enableTestTrustStore ? new trustStore_1.TestTrustStore() : new trustStore_1.TrustStore());
            let result = yield moduleVerifier.verify(base, files, options.packageName || '');
            if (result.isPrivate) {
                // Don't send identifiable telemetry about private packages.
                yield telemetry_1.queueTelemetry({
                    action: 'verify-module',
                    packageName: '',
                    packageVersion: '',
                    packageIsSigned: result.status != moduleVerifier_1.ModuleVerificationStatus.Unsigned,
                    signingIdentity: '',
                    identityIsTrusted: result.status == moduleVerifier_1.ModuleVerificationStatus.Trusted,
                });
            }
            else {
                // Send telemetry for public packages.
                yield telemetry_1.queueTelemetry({
                    action: 'verify-module',
                    packageName: result.packageName,
                    packageVersion: result.untrustedPackageVersion,
                    packageIsSigned: result.status != moduleVerifier_1.ModuleVerificationStatus.Unsigned,
                    signingIdentity: result.trustedIdentity != undefined ?
                        signatureIdentity_1.identityToString(result.trustedIdentity) : (result.untrustedIdentity != undefined ? signatureIdentity_1.identityToString(result.untrustedIdentity) : ''),
                    identityIsTrusted: result.status == moduleVerifier_1.ModuleVerificationStatus.Trusted,
                });
            }
            // Prompt user to trust package if untrusted.
            if (result.status == moduleVerifier_1.ModuleVerificationStatus.Untrusted && !options.nonInteractive) {
                let identityString = '';
                if (result.untrustedIdentity.keybaseUser !== undefined) {
                    identityString = result.untrustedIdentity.keybaseUser + ' on keybase.io';
                }
                else {
                    identityString = 'public key at ' + result.untrustedIdentity.pgpPublicKeyUrl;
                }
                const trustResults = yield inquirer.prompt([{
                        name: 'pkg',
                        type: 'confirm',
                        message: 'Package \'' + result.packageName + '\' is not trusted, but is signed by ' + identityString + '. ' +
                            'Do you want to trust this identity to sign \'' + result.packageName + '\' now and forever',
                        default: false
                    }]);
                let trustStore = new trustStore_1.TrustStore();
                let didModify = false;
                if (trustResults['pkg']) {
                    yield trustStore.addTrusted(result.untrustedIdentity, result.packageName);
                    didModify = true;
                    if (!result.isPrivate) {
                        yield telemetry_1.queueTelemetry({
                            action: 'grant-trust',
                            packageName: result.packageName,
                            packageVersion: result.untrustedPackageVersion,
                            packageIsSigned: true,
                            signingIdentity: result.trustedIdentity != undefined ?
                                signatureIdentity_1.identityToString(result.trustedIdentity) : (result.untrustedIdentity != undefined ? signatureIdentity_1.identityToString(result.untrustedIdentity) : ''),
                            identityIsTrusted: true,
                        });
                    }
                }
                else {
                    if (!result.isPrivate) {
                        yield telemetry_1.queueTelemetry({
                            action: 'not-grant-trust',
                            packageName: result.packageName,
                            packageVersion: result.untrustedPackageVersion,
                            packageIsSigned: true,
                            signingIdentity: result.trustedIdentity != undefined ?
                                signatureIdentity_1.identityToString(result.trustedIdentity) : (result.untrustedIdentity != undefined ? signatureIdentity_1.identityToString(result.untrustedIdentity) : ''),
                            identityIsTrusted: false,
                        });
                    }
                }
                result = yield moduleVerifier.verify(base, files, options.packageName || '');
            }
            switch (result.status) {
                case moduleVerifier_1.ModuleVerificationStatus.Compromised:
                    console.log('package is compromised: ' + result.reason);
                    return false;
                case moduleVerifier_1.ModuleVerificationStatus.Unsigned:
                    console.log('package is unsigned: ' + result.reason);
                    return false;
                case moduleVerifier_1.ModuleVerificationStatus.Untrusted:
                    console.log('package is untrusted');
                    return false;
                case moduleVerifier_1.ModuleVerificationStatus.Trusted:
                    console.log('package is trusted');
                    return true;
            }
        });
    }
    verifyDirectory(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Telemetry sending is done directly inside ModuleHierarchyVerifier, per package.
            let moduleHierarchyVerifier = new moduleHierarchyVerifier_1.ModuleHierarchyVerifier(path, options.enableTestTrustStore ? new trustStore_1.TestTrustStore() : new trustStore_1.TrustStore());
            let results = yield moduleHierarchyVerifier.verify();
            // First find any untrusted modules and ask the user if they
            // want to trust them.
            let promptStarted = false;
            let prompts = [];
            for (let path in results) {
                let result = results[path];
                if (result.status == moduleVerifier_1.ModuleVerificationStatus.Untrusted) {
                    let identityString = '';
                    if (result.untrustedIdentity.keybaseUser !== undefined) {
                        identityString = result.untrustedIdentity.keybaseUser + ' on keybase.io';
                    }
                    else {
                        identityString = 'public key at ' + result.untrustedIdentity.pgpPublicKeyUrl;
                    }
                    if (prompts.filter((value) => path_1.basename(value.name) == result.packageName).length == 0) {
                        prompts.push({
                            name: Buffer.from(path).toString('base64'),
                            type: 'confirm',
                            message: 'Package \'' + result.packageName + '\' is not trusted, but is signed by ' + identityString + '. ' +
                                'Do you want to trust this identity to sign \'' + result.packageName + '\' now and forever',
                            default: false
                        });
                    }
                }
            }
            if (prompts.length > 0 && !options.nonInteractive) {
                let didModify = false;
                const trustResults = yield inquirer.prompt(prompts);
                let trustStore = new trustStore_1.TrustStore();
                for (let path in trustResults) {
                    let realpath = Buffer.from(path, 'base64').toString('ascii');
                    if (trustResults[path]) {
                        yield trustStore.addTrusted(results[realpath].untrustedIdentity, results[realpath].packageName);
                        didModify = true;
                        if (!results[realpath].isPrivate) {
                            yield telemetry_1.queueTelemetry({
                                action: 'grant-trust',
                                packageName: results[realpath].packageName,
                                packageVersion: results[realpath].untrustedPackageVersion,
                                packageIsSigned: true,
                                signingIdentity: results[realpath].trustedIdentity != undefined ?
                                    signatureIdentity_1.identityToString(results[realpath].trustedIdentity) : (results[realpath].untrustedIdentity != undefined ? signatureIdentity_1.identityToString(results[realpath].untrustedIdentity) : ''),
                                identityIsTrusted: true,
                            });
                        }
                    }
                    else {
                        if (!results[realpath].isPrivate) {
                            yield telemetry_1.queueTelemetry({
                                action: 'not-grant-trust',
                                packageName: results[realpath].packageName,
                                packageVersion: results[realpath].untrustedPackageVersion,
                                packageIsSigned: true,
                                signingIdentity: results[realpath].trustedIdentity != undefined ?
                                    signatureIdentity_1.identityToString(results[realpath].trustedIdentity) : (results[realpath].untrustedIdentity != undefined ? signatureIdentity_1.identityToString(results[realpath].untrustedIdentity) : ''),
                                identityIsTrusted: false,
                            });
                        }
                    }
                }
                if (didModify) {
                    // Recalculate results now that trust prompts have been answered.
                    results = yield moduleHierarchyVerifier.verify();
                }
            }
            // Show summary of packages.
            let compromisedCount = 0;
            let unsignedCount = 0;
            let untrustedCount = 0;
            let trustedCount = 0;
            for (let path in results) {
                let result = results[path];
                switch (result.status) {
                    case moduleVerifier_1.ModuleVerificationStatus.Compromised:
                        compromisedCount++;
                        break;
                    case moduleVerifier_1.ModuleVerificationStatus.Unsigned:
                        unsignedCount++;
                        break;
                    case moduleVerifier_1.ModuleVerificationStatus.Untrusted:
                        untrustedCount++;
                        break;
                    case moduleVerifier_1.ModuleVerificationStatus.Trusted:
                        trustedCount++;
                        break;
                }
            }
            console.log('package verification summary:');
            console.log(compromisedCount + ' compromised');
            console.log(unsignedCount + ' unsigned');
            console.log(untrustedCount + ' untrusted');
            console.log(trustedCount + ' trusted');
            if (options.full) {
                let targetLength = 0;
                for (let path in results) {
                    if (results[path].packageName.length > targetLength) {
                        targetLength = results[path].packageName.length;
                    }
                }
                targetLength += 2;
                const padRight = (input, len) => {
                    while (input.length < len) {
                        input = input + ' ';
                    }
                    return input;
                };
                console.log();
                for (let path in results) {
                    let result = results[path];
                    let status = 'unknown';
                    switch (result.status) {
                        case moduleVerifier_1.ModuleVerificationStatus.Compromised:
                            status = 'compromised!';
                            break;
                        case moduleVerifier_1.ModuleVerificationStatus.Unsigned:
                            status = 'unsigned';
                            break;
                        case moduleVerifier_1.ModuleVerificationStatus.Untrusted:
                            status = 'untrusted';
                            break;
                        case moduleVerifier_1.ModuleVerificationStatus.Trusted:
                            status = 'trusted';
                            break;
                    }
                    console.log(padRight(results[path].packageName, targetLength) + ' ' +
                        padRight(status, 25) + ' ' +
                        (result.reason || ''));
                }
            }
            if (compromisedCount > 0 || unsignedCount > 0 || untrustedCount > 0) {
                return false;
            }
            else {
                return true;
            }
        });
    }
};
__decorate([
    __param(0, clime_1.param({
        name: 'pkgdir|tarball',
        description: 'path to package directory or tarball',
        required: false,
    })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, VerifyOptions]),
    __metadata("design:returntype", Promise)
], default_1.prototype, "execute", null);
default_1 = __decorate([
    clime_1.command({
        description: 'verify an npm/yarn package directory',
    })
], default_1);
exports.default = default_1;
//# sourceMappingURL=verify.js.map