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
const moduleVerifier_1 = require("./moduleVerifier");
const packlist = require("npm-packlist");
const telemetry_1 = require("../lib/telemetry");
const fsPromise_1 = require("./util/fsPromise");
class ModuleHierarchyVerifier {
    constructor(dir, trustStore) {
        this.dir = dir;
        this.trustStore = trustStore;
    }
    verify() {
        return __awaiter(this, void 0, void 0, function* () {
            // build up a list of node modules we need to verify, based on the current directory
            const modules = yield this.findModules(this.dir);
            modules.push({
                untrustedPackageInfo: JSON.parse(yield fsPromise_1.readFilePromise(path.join(this.dir, "package.json"))),
                path: this.dir
            });
            let promises = [];
            let moduleVerifier = new moduleVerifier_1.ModuleVerifier(this.trustStore);
            let results = {};
            for (let moduleInfo of modules) {
                promises.push(((moduleInfo) => __awaiter(this, void 0, void 0, function* () {
                    let expectedPackageName = path.basename(moduleInfo.path);
                    if (expectedPackageName == ".") {
                        // This is the top-level module we want to verify. Because this module might be
                        // cloned by the user with Git into a directory name that doesn't match, we
                        // trust package.json for the expected package name instead.
                        expectedPackageName = moduleInfo.untrustedPackageInfo.name || "";
                    }
                    let result = yield moduleVerifier.verify(moduleInfo.path, yield packlist({ path: moduleInfo.path }), expectedPackageName);
                    results[moduleInfo.path] = result;
                    yield telemetry_1.queueTelemetryFromModuleVerificationResult("verify-module", result);
                }))(moduleInfo));
            }
            yield Promise.all(promises);
            return results;
        });
    }
    findModules(dir) {
        return __awaiter(this, void 0, void 0, function* () {
            let resultModules = [];
            let ourModules = [];
            try {
                ourModules = yield fsPromise_1.readdirPromise(path.join(dir, "node_modules"));
            }
            catch (e) {
                if (e && e.code == "ENOENT") {
                    // this package has no child modules.
                }
                else if (e && e.code == "ENOTDIR") {
                    // this is not a package (e.g. .yarn-integrity file)
                }
                else {
                    throw e;
                }
            }
            for (let otherModule of ourModules) {
                if (otherModule[0] == "@") {
                    // this is a namespace folder, iterate through it instead.
                    const nsModules = yield fsPromise_1.readdirPromise(path.join(dir, "node_modules", otherModule));
                    for (let nsModule of nsModules) {
                        const theirModules = yield this.findModules(path.join(dir, "node_modules", otherModule, nsModule));
                        resultModules.push(...theirModules);
                    }
                }
                else {
                    const theirModules = yield this.findModules(path.join(dir, "node_modules", otherModule));
                    resultModules.push(...theirModules);
                }
                if (otherModule[0] != "." && otherModule[0] != "@") {
                    resultModules.push({
                        untrustedPackageInfo: JSON.parse(yield fsPromise_1.readFilePromise(path.join(dir, "node_modules", otherModule, "package.json"))),
                        path: path.join(dir, "node_modules", otherModule)
                    });
                }
            }
            return resultModules;
        });
    }
}
exports.ModuleHierarchyVerifier = ModuleHierarchyVerifier;
//# sourceMappingURL=moduleHierarchyVerifier.js.map