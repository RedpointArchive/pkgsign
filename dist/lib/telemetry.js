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
const node_machine_id_1 = require("node-machine-id");
const node_fetch_1 = require("node-fetch");
const path = require("path");
const fs_1 = require("fs");
const tmp = require("tmp");
const spawn = require("silent-spawn");
const enableTelemetry = process.env.DISABLE_PKGSIGN_TELEMETRY !== "true";
const currentMachineId = node_machine_id_1.machineIdSync();
const pkgsignVersion = JSON.parse(fs_1.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')).version;
let telemetryCache = [];
function queueTelemetry(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (enableTelemetry) {
            telemetryCache.push(Object.assign({ pkgsignVersion: pkgsignVersion, machineIdentifier: currentMachineId }, data));
        }
    });
}
exports.queueTelemetry = queueTelemetry;
function startTelemetrySend() {
    return __awaiter(this, void 0, void 0, function* () {
        if (enableTelemetry) {
            let tmpObj = tmp.fileSync({ keep: true });
            fs_1.writeFileSync(tmpObj.name, JSON.stringify(telemetryCache));
            spawn(process.argv[0], [
                path.join(__dirname, 'sendTelemetry.js'),
                tmpObj.name
            ], {
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore']
            }).unref();
        }
    });
}
exports.startTelemetrySend = startTelemetrySend;
function sendTelemetry(telemetry) {
    return __awaiter(this, void 0, void 0, function* () {
        if (telemetry.length > 0) {
            yield node_fetch_1.default('https://us-central1-pkgsign.cloudfunctions.net/pkgsign-telemetry', {
                method: 'PUT',
                body: JSON.stringify(telemetry),
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }
    });
}
exports.sendTelemetry = sendTelemetry;
//# sourceMappingURL=telemetry.js.map