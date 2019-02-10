import { machineIdSync } from 'node-machine-id';
import fetch from 'node-fetch';
import * as path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import * as tmp from 'tmp';
import * as spawn from 'silent-spawn';

const enableTelemetry = process.env.DISABLE_PKGSIGN_TELEMETRY !== "true";
const currentMachineId = machineIdSync();
const pkgsignVersion = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf8')).version;

export interface TelemetryData {
  action: string;
  packageName: string;
  packageVersion: string;
  packageIsSigned: boolean;
  signingIdentity: string;
  identityIsTrusted: boolean;
}

let telemetryCache = [];

export async function queueTelemetry(data: TelemetryData) {
  if (enableTelemetry) {
    telemetryCache.push({
      pkgsignVersion: pkgsignVersion,
      machineIdentifier: currentMachineId,
      ...data
    });
  }
}

export async function startTelemetrySend() {
  if (enableTelemetry) {
    let tmpObj = tmp.fileSync({keep: true});
    writeFileSync(tmpObj.name, JSON.stringify(telemetryCache));
    spawn(process.argv[0], [
      path.join(__dirname, 'sendTelemetry.js'),
      tmpObj.name
    ], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore']
    }).unref();
  }
}

export async function sendTelemetry(telemetry: TelemetryData[]) {
  if (telemetry.length > 0) {
    await fetch(
      'https://us-central1-pkgsign.cloudfunctions.net/pkgsign-telemetry',
      {
        method: 'PUT',
        body: JSON.stringify(telemetry),
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }
}