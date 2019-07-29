"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const filesEntryHandler_1 = require("./filesEntryHandler");
const identityEntryHandler_1 = require("./identityEntryHandler");
const npmCompatiblePackageJsonEntryHandler_1 = require("./npmCompatiblePackageJsonEntryHandler");
const packageJsonEntryHandler_1 = require("./packageJsonEntryHandler");
exports.availableEntryHandlers = [
    filesEntryHandler_1.FilesEntryHandler,
    identityEntryHandler_1.IdentityEntryHandler,
    npmCompatiblePackageJsonEntryHandler_1.NpmCompatiblePackageJsonEntryHandler,
    packageJsonEntryHandler_1.PackageJsonEntryHandler
];
exports.availableEntryHandlersByName = new Map();
for (const entryHandler of exports.availableEntryHandlers) {
    exports.availableEntryHandlersByName.set(entryHandler.getEntryType(), entryHandler);
}
//# sourceMappingURL=registry.js.map