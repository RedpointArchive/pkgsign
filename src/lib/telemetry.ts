import { machineIdSync } from "node-machine-id";
import fetch from "node-fetch";
import * as path from "path";
import { readFileSync, writeFileSync } from "fs";
import * as tmp from "tmp";
import * as spawn from "silent-spawn";
import { readFilePromise } from "./util/fsPromise";
import { join as pathJoin } from "path";
import { SignatureIdentity, identityToString } from "./types";

const enableTelemetry = process.env.DISABLE_PKGSIGN_TELEMETRY !== "true";
const currentMachineId = machineIdSync();
const pkgsignVersion = JSON.parse(
  readFileSync(path.join(__dirname, "../../package.json"), "utf8")
).version;

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
    let tmpObj = tmp.fileSync({ keep: true });
    writeFileSync(tmpObj.name, JSON.stringify(telemetryCache));
    spawn(
      process.argv[0],
      [path.join(__dirname, "sendTelemetry.js"), tmpObj.name],
      {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"]
      }
    ).unref();
  }
}

export async function sendTelemetry(telemetry: TelemetryData[]) {
  if (telemetry.length > 0) {
    await fetch(
      "https://us-central1-pkgsign.cloudfunctions.net/pkgsign-telemetry",
      {
        method: "PUT",
        body: JSON.stringify(telemetry),
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

export async function queueTelemetryPackageAction(
  context: {
    dir: string;
    relFilesOnDisk: string[];
  },
  identity: SignatureIdentity,
  telemetryAction: string
) {
  let packageJson: any | null | undefined = undefined;
  for (let relPath of context.relFilesOnDisk) {
    const normalisedPath = relPath.replace(/\\/g, "/");
    if (normalisedPath == "package.json") {
      try {
        packageJson = JSON.parse(
          await readFilePromise(pathJoin(context.dir, relPath))
        );
      } catch (e) {
        packageJson = undefined;
      }
      break;
    }
  }

  if (packageJson != null && packageJson.name != undefined) {
    if (packageJson.private != true) {
      // This is not a private package, so record telemetry with the package
      // name included.
      await queueTelemetry({
        action: telemetryAction,
        packageName: packageJson.name,
        packageVersion: packageJson.version || "",
        packageIsSigned: true,
        signingIdentity: identityToString(identity),
        identityIsTrusted: true
      });
    } else {
      // Private package, don't include any package information.
      await queueTelemetry({
        action: telemetryAction,
        packageName: "",
        packageVersion: "",
        packageIsSigned: true,
        signingIdentity: "",
        identityIsTrusted: true
      });
    }
  } else {
    // Can't read package.json or it doesn't exist - don't include
    // any package information.
    await queueTelemetry({
      action: telemetryAction,
      packageName: "",
      packageVersion: "",
      packageIsSigned: true,
      signingIdentity: "",
      identityIsTrusted: true
    });
  }
}
