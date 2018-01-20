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
const fsPromise_1 = require("./fsPromise");
const openpgp = require("openpgp");
class PgpSigner {
    constructor(privateKeyPath, privateKeyPassphrase, publicKeyHttpsUrl) {
        this.privateKeyPath = privateKeyPath;
        this.privateKeyPassphrase = privateKeyPassphrase;
        this.publicKeyHttpsUrl = publicKeyHttpsUrl;
    }
    getIdentity() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                pgpPublicKeyUrl: this.publicKeyHttpsUrl
            };
        });
    }
    signEntries(deterministicString) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('signing with private pgp key...');
            const privateKeyFileContents = yield fsPromise_1.readFilePromise(this.privateKeyPath);
            const privateKeyObject = openpgp.key.readArmored(privateKeyFileContents).keys[0];
            privateKeyObject.decrypt(this.privateKeyPassphrase);
            const options = {
                data: deterministicString,
                privateKeys: privateKeyObject,
                detached: true,
            };
            const signedResult = yield openpgp.sign(options);
            return signedResult.signature.replace(/\r\n/g, "\n");
        });
    }
}
exports.PgpSigner = PgpSigner;
//# sourceMappingURL=pgpSigner.js.map