import { IEntryHandler, generateCompromisedVerificationResult } from ".";
import {
  ModuleVerificationResult,
  SignatureIdentity,
  IVerifyEntryContext,
  IGenerateEntryContext
} from "../types";
import { createHash } from "crypto";
import { normalizeSync } from "../thirdparty/jsonNormalize";
import { readFileSync } from "fs";
import { join as pathJoin } from "path";
import { readFilePromise } from "../util/fsPromise";

interface NpmCompatiblePackageJsonEntry {
  packageJsonProperties: Array<string>;
  sha512: string;
}

function sha512OfObject(value: any, properties: Array<string>): string {
  const orderedObject: any = {};
  properties
    // filter properties starting with underscore
    .filter(key => key.indexOf("_") != 0)
    .sort()
    .forEach(key => (orderedObject[key] = value[key]));

  const hash = createHash("sha512");
  hash.update(normalizeSync(orderedObject));
  const hashStr = hash.digest("hex");

  return hashStr;
}

export const NpmCompatiblePackageJsonEntryHandler: IEntryHandler<
  NpmCompatiblePackageJsonEntry
> = {
  getEntryType: (): string => {
    return "npmCompatiblePackageJson/v1alpha2";
  },

  generateEntry: async (
    context: IGenerateEntryContext
  ): Promise<NpmCompatiblePackageJsonEntry | null> => {
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
      packageJsonProperties: Object.keys(packageJson).sort(),
      sha512: await sha512OfObject(packageJson, Object.keys(packageJson))
    };
  },

  verifyEntry: async (
    context: IVerifyEntryContext,
    value: NpmCompatiblePackageJsonEntry
  ): Promise<ModuleVerificationResult | null> => {
    if (!value.packageJsonProperties) {
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

      const hash = sha512OfObject(
        packageJsonActual,
        value.packageJsonProperties
      );
      if (hash != value.sha512) {
        return generateCompromisedVerificationResult(
          context,
          "package.json on disk does not match the signed package.json"
        );
      }
    }

    // No invalidation of signature.
    return null;
  },

  toDeterministicString: (value: NpmCompatiblePackageJsonEntry): string => {
    return normalizeSync(value.packageJsonProperties) + "\n" + value.sha512;
  },

  getIdentity: (
    value: NpmCompatiblePackageJsonEntry
  ): SignatureIdentity | null => {
    return null;
  }
};
