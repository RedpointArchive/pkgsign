import * as path from "path";
import { ModuleVerifier } from "./moduleVerifier";
import { ITrustStore } from "./trustStore";
import * as packlist from "npm-packlist";
import { queueTelemetry } from "../lib/telemetry";
import {
  ModuleVerificationResult,
  ModuleVerificationStatus,
  identityToString
} from "./types";
import { readFilePromise, readdirPromise } from "./util/fsPromise";

export interface ModuleInfo {
  untrustedPackageInfo: any;
  path: string;
}

export class ModuleHierarchyVerifier {
  constructor(private dir: string, private trustStore: ITrustStore) {}

  public async verify(): Promise<{ [path: string]: ModuleVerificationResult }> {
    // build up a list of node modules we need to verify, based on the current directory
    const modules = await this.findModules(this.dir);
    modules.push({
      untrustedPackageInfo: JSON.parse(
        await readFilePromise(path.join(this.dir, "package.json"))
      ),
      path: this.dir
    });

    let promises: Promise<void>[] = [];
    let moduleVerifier = new ModuleVerifier(this.trustStore);
    let results: { [path: string]: ModuleVerificationResult } = {};
    for (let moduleInfo of modules) {
      promises.push(
        (async moduleInfo => {
          let expectedPackageName = path.basename(moduleInfo.path);
          if (expectedPackageName == ".") {
            // This is the top-level module we want to verify. Because this module might be
            // cloned by the user with Git into a directory name that doesn't match, we
            // trust package.json for the expected package name instead.
            expectedPackageName = moduleInfo.untrustedPackageInfo.name || "";
          }
          let result = await moduleVerifier.verify(
            moduleInfo.path,
            await packlist({ path: moduleInfo.path }),
            expectedPackageName
          );
          results[moduleInfo.path] = result;
          if (result.isPrivate) {
            // Don't send identifiable telemetry about private packages.
            await queueTelemetry({
              action: "verify-module",
              packageName: "",
              packageVersion: "",
              packageIsSigned:
                result.status != ModuleVerificationStatus.Unsigned,
              signingIdentity: "",
              identityIsTrusted:
                result.status == ModuleVerificationStatus.Trusted
            });
          } else {
            // Send telemetry for public packages.
            await queueTelemetry({
              action: "verify-module",
              packageName: result.packageName,
              packageVersion: result.untrustedPackageVersion,
              packageIsSigned:
                result.status != ModuleVerificationStatus.Unsigned,
              signingIdentity:
                result.trustedIdentity != undefined
                  ? identityToString(result.trustedIdentity)
                  : result.untrustedIdentity != undefined
                  ? identityToString(result.untrustedIdentity)
                  : "",
              identityIsTrusted:
                result.status == ModuleVerificationStatus.Trusted
            });
          }
        })(moduleInfo)
      );
    }
    await Promise.all(promises);

    return results;
  }

  private async findModules(dir: string): Promise<ModuleInfo[]> {
    let resultModules: ModuleInfo[] = [];
    let ourModules: string[] = [];
    try {
      ourModules = await readdirPromise(path.join(dir, "node_modules"));
    } catch (e) {
      if (e && e.code == "ENOENT") {
        // this package has no child modules.
      } else if (e && e.code == "ENOTDIR") {
        // this is not a package (e.g. .yarn-integrity file)
      } else {
        throw e;
      }
    }
    for (let otherModule of ourModules) {
      if (otherModule[0] == "@") {
        // this is a namespace folder, iterate through it instead.
        const nsModules = await readdirPromise(
          path.join(dir, "node_modules", otherModule)
        );
        for (let nsModule of nsModules) {
          const theirModules = await this.findModules(
            path.join(dir, "node_modules", otherModule, nsModule)
          );
          resultModules.push(...theirModules);
        }
      } else {
        const theirModules = await this.findModules(
          path.join(dir, "node_modules", otherModule)
        );
        resultModules.push(...theirModules);
      }

      if (otherModule[0] != "." && otherModule[0] != "@") {
        resultModules.push({
          untrustedPackageInfo: JSON.parse(
            await readFilePromise(
              path.join(dir, "node_modules", otherModule, "package.json")
            )
          ),
          path: path.join(dir, "node_modules", otherModule)
        });
      }
    }
    return resultModules;
  }
}
