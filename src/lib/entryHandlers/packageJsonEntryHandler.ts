import { IEntryHandler, generateCompromisedVerificationResult } from ".";
import {
  SignatureIdentity,
  ModuleVerificationResult,
  IVerifyEntryContext,
  IGenerateEntryContext
} from "../types";
import { normalizeSync } from "../thirdparty/jsonNormalize";
import { readFileSync } from "fs";
import { join as pathJoin } from "path";
import { readFilePromise } from "../util/fsPromise";

interface PackageJsonEntry {
  packageJson: any;
}

export const PackageJsonEntryHandler: IEntryHandler<PackageJsonEntry> = {
  getEntryType: (): string => {
    return "packageJson/v1alpha2";
  },

  generateEntry: async (
    context: IGenerateEntryContext
  ): Promise<PackageJsonEntry | null> => {
    let packageJson: any | null | undefined = undefined;
    for (let relPath of context.relFilesOnDisk) {
      const normalisedPath = relPath.replace(/\\/g, "/");
      if (normalisedPath == "package.json") {
        // This file will be included in it's own package entry.
        try {
          packageJson = JSON.parse(
            await readFilePromise(pathJoin(context.dir, relPath))
          );
        } catch (e) {
          console.warn("unable to parse package.json as JSON for signing");
          packageJson = undefined; /* do not include package json signature entry, so file validation will fallback to exact match */
        }

        break;
      }
    }

    if (packageJson === undefined) {
      // We couldn't find or parse package.json, do not generate an entry.
      // If package.json exists and is unparseable, FilesEntryHandler will
      // include it in the list of files to directly hash.
      return null;
    }

    return {
      packageJson
    };
  },

  verifyEntry: async (
    context: IVerifyEntryContext,
    value: PackageJsonEntry
  ): Promise<ModuleVerificationResult> => {
    if (this.packageJson == null) {
      // Verify that package.json does not exist on disk.
      if (context.relFilesOnDisk.indexOf("package.json") !== -1) {
        return generateCompromisedVerificationResult(
          context,
          "package.json exists in the package, but was not in the signature"
        );
      }
    } else {
      // Verify that package.json does exist on disk.
      if (context.relFilesOnDisk.indexOf("package.json") === -1) {
        return generateCompromisedVerificationResult(
          context,
          "package.json does not exist in the package, but was present in the signature"
        );
      }

      // Try to read the contents of package.json.
      const packageJsonRaw = readFileSync(
        pathJoin(context.dir, "package.json"),
        "utf8"
      );
      let packageJsonActual;
      try {
        packageJsonActual = JSON.parse(packageJsonRaw);
      } catch (e) {
        return generateCompromisedVerificationResult(
          context,
          "package.json does not contain valid JSON"
        );
      }

      // Stringify both our expected and actual values.
      const normalizedActual = normalizeSync(packageJsonActual);
      const normalizedExpected = normalizeSync(this.packageJson);

      // If they don't match, then package.json doesn't match the expected value.
      if (normalizedActual !== normalizedExpected) {
        return generateCompromisedVerificationResult(
          context,
          "package.json on disk does not match the signed package.json"
        );
      }
    }

    // No invalidation of signature.
    return null;
  },

  toDeterministicString: (value: PackageJsonEntry): string => {
    return normalizeSync(this.packageJson);
  },

  getIdentity: (value: PackageJsonEntry): SignatureIdentity => {
    return null;
  }
};
