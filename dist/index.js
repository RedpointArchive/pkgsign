#!/usr/bin/env node
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
const Path = require("path");
const clime_1 = require("clime");
const telemetry_1 = require("./lib/telemetry");
let cli = new clime_1.CLI('pkgsign', Path.join(__dirname, 'commands'));
let shim = new clime_1.Shim(cli);
function execute(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield shim.execute(argv);
        }
        catch (e) {
            // TODO: Record errors in telemetry?
            throw e;
        }
        finally {
            try {
                yield telemetry_1.startTelemetrySend();
            }
            catch (ee) {
                console.warn(ee);
            }
        }
    });
}
execute(process.argv);
//# sourceMappingURL=index.js.map