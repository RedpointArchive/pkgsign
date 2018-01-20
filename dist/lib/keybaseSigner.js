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
const cmd = require("node-cmd");
const path_1 = require("path");
const fsPromise_1 = require("./fsPromise");
const stripAnsi = Promise.resolve().then(() => require('strip-ansi'));
class KeybaseSigner {
    getIdentity() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('determining your keybase username...');
            const keybaseIdentity = yield new Promise((resolve, reject) => {
                cmd.get('keybase id', (err, data, stderr) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        const result = /Identifying (.+)/g.exec(data + stderr);
                        if (result[1] === undefined) {
                            reject(new Error('keybase didn\'t return your username for \'keybase id\''));
                        }
                        else {
                            resolve(result[1]);
                        }
                    }
                });
            });
            let stripAnsiFn = yield stripAnsi;
            return {
                keybaseUser: stripAnsiFn(keybaseIdentity),
            };
        });
    }
    signEntries(deterministicString) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('requesting keybase pgp sign deterministic signature...');
            console.log('(you may receive an interactive prompt from keybase)');
            const wd = yield fsPromise_1.createWorkingDirectory();
            const fileToSignPath = path_1.join(wd, 'signature.sig');
            yield fsPromise_1.writeFilePromise(fileToSignPath, deterministicString);
            const keybaseSignature = yield new Promise((resolve, reject) => {
                cmd.get('keybase pgp sign --detached -i "' + fileToSignPath + '"', (err, data, stderr) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
            yield fsPromise_1.unlinkPromise(fileToSignPath);
            return keybaseSignature;
        });
    }
}
exports.KeybaseSigner = KeybaseSigner;
//# sourceMappingURL=keybaseSigner.js.map