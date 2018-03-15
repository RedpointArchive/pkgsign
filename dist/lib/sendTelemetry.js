"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require("process");
const fs_1 = require("fs");
const telemetry_1 = require("./telemetry");
const telemetry = JSON.parse(fs_1.readFileSync(process.argv[2], 'utf8'));
telemetry_1.sendTelemetry(telemetry)
    .then(() => {
    fs_1.unlinkSync(process.argv[2]);
    process.exit(0);
})
    .catch((err) => {
    fs_1.unlinkSync(process.argv[2]);
    process.exit(1);
});
//# sourceMappingURL=sendTelemetry.js.map