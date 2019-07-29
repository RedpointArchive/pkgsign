import { Command, command, param, option, Options } from "clime";
import { lstatSync } from "fs";
import { ModuleHierarchyVerifier } from "../lib/moduleHierarchyVerifier";
import { ModuleVerifier } from "../lib/moduleVerifier";
import * as inquirer from "inquirer";
import * as path from "path";
import { basename } from "path";
import { TrustStore, TestTrustStore } from "../lib/trustStore";
import { queueTelemetryFromModuleVerificationResult } from "../lib/telemetry";
import {
  createWorkingDirectory,
  decompress,
  recursivePromise
} from "../lib/util/fsPromise";
import { ModuleVerificationStatus } from "../lib/types";

export class VerifyOptions extends Options {
  @option({
    name: "full",
    toggle: true,
    description: "show verification status of individual packages"
  })
  full: boolean = false;
  @option({
    name: "non-interactive",
    toggle: true,
    description: "do not prompt to trust packages that are untrusted"
  })
  nonInteractive: boolean = false;
  @option({
    name: "package-name",
    description: "if verifying a tarball, this is the expected package name"
  })
  packageName: string = "";
  @option({
    name: "enable-test-trust-store",
    toggle: true,
    description: "enables the test trust store, for debugging purposes only"
  })
  enableTestTrustStore: boolean = false;
  @option({
    name: "allow-unsigned-packages",
    toggle: true,
    description: "verify doesn't fail on unsigned packages"
  })
  allowUnsignedPackages: boolean = false;
}

@command({
  description: "verify an npm/yarn package directory"
})
export default class extends Command {
  public async execute(
    @param({
      name: "pkgdir|tarball",
      description: "path to package directory or tarball",
      required: false
    })
    path: string,
    options: VerifyOptions
  ): Promise<void> {
    if (await this.executeInternal(path, options)) {
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  }

  public async executeInternal(
    path: string,
    options: VerifyOptions
  ): Promise<boolean> {
    if (path === undefined) {
      // Default path to the current directory if not provided.
      path = ".";
    }

    if (path.endsWith(".tgz") && lstatSync(path).isFile()) {
      return await this.verifyTarball(path, options);
    } else {
      return await this.verifyDirectory(path, options);
    }
  }

  private async verifyTarball(
    tarballPath: string,
    options: VerifyOptions
  ): Promise<boolean> {
    const wd = await createWorkingDirectory();
    console.log("extracting unsigned tarball...");
    await decompress(tarballPath, wd);

    console.log("building file list...");
    const base = path.join(wd, "package");
    const files = (await recursivePromise(base)).map(fullPath =>
      fullPath.substr(base.length + 1).replace(/\\/g, "/")
    );

    console.log("verifying package...");
    const moduleVerifier = new ModuleVerifier(
      options.enableTestTrustStore ? new TestTrustStore() : new TrustStore()
    );
    let result = await moduleVerifier.verify(
      base,
      files,
      options.packageName || ""
    );

    queueTelemetryFromModuleVerificationResult("verify-module", result);

    // Prompt user to trust package if untrusted.
    if (
      result.status == ModuleVerificationStatus.Untrusted &&
      !options.nonInteractive
    ) {
      let identityString = "";
      if (result.untrustedIdentity.keybaseUser !== undefined) {
        identityString =
          result.untrustedIdentity.keybaseUser + " on keybase.io";
      } else {
        identityString =
          "public key at " + result.untrustedIdentity.pgpPublicKeyUrl;
      }
      const trustResults = await inquirer.prompt([
        {
          name: "pkg",
          type: "confirm",
          message:
            "Package '" +
            result.packageName +
            "' is not trusted, but is signed by " +
            identityString +
            ". " +
            "Do you want to trust this identity to sign '" +
            result.packageName +
            "' now and forever",
          default: false
        }
      ] as inquirer.ConfirmQuestion<{ pkg: boolean }>[]);
      let trustStore = new TrustStore();
      if (trustResults["pkg"]) {
        await trustStore.addTrusted(
          result.untrustedIdentity,
          result.packageName
        );

        if (!result.isPrivate) {
          queueTelemetryFromModuleVerificationResult("grant-trust", result);
        }
      } else {
        if (!result.isPrivate) {
          queueTelemetryFromModuleVerificationResult("not-grant-trust", result);
        }
      }

      result = await moduleVerifier.verify(
        base,
        files,
        options.packageName || ""
      );
    }

    switch (result.status) {
      case ModuleVerificationStatus.Compromised:
        console.log("package is compromised: " + result.reason);
        return false;
      case ModuleVerificationStatus.Unsigned:
        console.log("package is unsigned: " + result.reason);
        return false;
      case ModuleVerificationStatus.Untrusted:
        console.log("package is untrusted");
        return false;
      case ModuleVerificationStatus.Trusted:
        console.log("package is trusted");
        return true;
    }
  }

  private async verifyDirectory(
    path: string,
    options: VerifyOptions
  ): Promise<boolean> {
    // Telemetry sending is done directly inside ModuleHierarchyVerifier, per package.

    let moduleHierarchyVerifier = new ModuleHierarchyVerifier(
      path,
      options.enableTestTrustStore ? new TestTrustStore() : new TrustStore()
    );
    let results = await moduleHierarchyVerifier.verify();

    let prompts: inquirer.ConfirmQuestion<{ [id: string]: boolean }>[] = [];
    for (let path in results) {
      let result = results[path];
      if (result.status == ModuleVerificationStatus.Untrusted) {
        let identityString = "";
        if (result.untrustedIdentity.keybaseUser !== undefined) {
          identityString =
            result.untrustedIdentity.keybaseUser + " on keybase.io";
        } else {
          identityString =
            "public key at " + result.untrustedIdentity.pgpPublicKeyUrl;
        }
        if (
          prompts.filter(
            value =>
              value.name !== undefined &&
              basename(value.name) == result.packageName
          ).length == 0
        ) {
          prompts.push({
            name: Buffer.from(path).toString("base64"),
            type: "confirm",
            message:
              "Package '" +
              result.packageName +
              "' is not trusted, but is signed by " +
              identityString +
              ". " +
              "Do you want to trust this identity to sign '" +
              result.packageName +
              "' now and forever",
            default: false
          } as inquirer.ConfirmQuestion<{ [id: string]: boolean }>);
        }
      }
    }

    if (prompts.length > 0 && !options.nonInteractive) {
      let didModify = false;
      const trustResults = await inquirer.prompt(prompts);
      let trustStore = new TrustStore();
      for (let path in trustResults) {
        let realpath = Buffer.from(path, "base64").toString("ascii");
        const result = results[realpath];
        if (result.status == ModuleVerificationStatus.Untrusted) {
          if (trustResults[path]) {
            await trustStore.addTrusted(
              result.untrustedIdentity,
              result.packageName
            );
            didModify = true;

            if (!result.isPrivate) {
              queueTelemetryFromModuleVerificationResult("grant-trust", result);
            }
          } else {
            if (!results[realpath].isPrivate) {
              queueTelemetryFromModuleVerificationResult(
                "not-grant-trust",
                result
              );
            }
          }
        }
      }

      if (didModify) {
        // Recalculate results now that trust prompts have been answered.
        results = await moduleHierarchyVerifier.verify();
      }
    }

    // Show summary of packages.
    let compromisedCount = 0;
    let unsignedCount = 0;
    let untrustedCount = 0;
    let trustedCount = 0;

    for (let path in results) {
      let result = results[path];
      switch (result.status) {
        case ModuleVerificationStatus.Compromised:
          compromisedCount++;
          break;
        case ModuleVerificationStatus.Unsigned:
          unsignedCount++;
          break;
        case ModuleVerificationStatus.Untrusted:
          untrustedCount++;
          break;
        case ModuleVerificationStatus.Trusted:
          trustedCount++;
          break;
      }
    }

    console.log("package verification summary:");
    console.log(compromisedCount + " compromised");
    console.log(unsignedCount + " unsigned");
    console.log(untrustedCount + " untrusted");
    console.log(trustedCount + " trusted");

    if (options.full) {
      let targetLength = 0;
      for (let path in results) {
        if (results[path].packageName.length > targetLength) {
          targetLength = results[path].packageName.length;
        }
      }
      targetLength += 2;
      const padRight = (input: string, len: number) => {
        while (input.length < len) {
          input = input + " ";
        }
        return input;
      };
      console.log();
      for (let path in results) {
        let result = results[path];
        let status = "unknown";
        switch (result.status) {
          case ModuleVerificationStatus.Compromised:
            status = "compromised!";
            break;
          case ModuleVerificationStatus.Unsigned:
            status = "unsigned";
            break;
          case ModuleVerificationStatus.Untrusted:
            status = "untrusted";
            break;
          case ModuleVerificationStatus.Trusted:
            status = "trusted";
            break;
        }
        console.log(
          padRight(results[path].packageName, targetLength) +
            " " +
            padRight(status, 25) +
            " " +
            (result.reason || "")
        );
      }
    }

    if (
      compromisedCount > 0 ||
      (!options.allowUnsignedPackages && unsignedCount > 0) ||
      untrustedCount > 0
    ) {
      return false;
    } else {
      return true;
    }
  }
}
