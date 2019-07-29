import { IEntryHandler, generateCompromisedVerificationResult } from ".";
import { join as pathJoin } from "path";
import { sha512OfFile, readFilePromise } from "../util/fsPromise";
import {
  ModuleVerificationStatus,
  ModuleVerificationResult,
  SignatureIdentity,
  IVerifyEntryContext,
  IGenerateEntryContext
} from "../types";

// exported only for tests
export interface FileEntry {
  path: string;
  sha512: string;
}

interface FilesEntry {
  files: FileEntry[];
}

export const FilesEntryHandler: IEntryHandler<FilesEntry> = {
  getEntryType: (): string => {
    return "files/v1alpha2";
  },

  generateEntry: async (
    context: IGenerateEntryContext
  ): Promise<FilesEntry | null> => {
    let entries: FileEntry[] = [];
    for (let relPath of context.relFilesOnDisk) {
      const normalisedPath = relPath.replace(/\\/g, "/");
      if (normalisedPath == "signature.json") {
        // This file might be included in the Git repo to sign the contents of the
        // latest commit against Keybase or PGP, but it should never be included
        // in the signature (because we're about to replace it in the signed package
        // anyway).
        continue;
      }
      if (normalisedPath == "package.json") {
        // This file will be included in it's own package entry.
        try {
          JSON.parse(await readFilePromise(pathJoin(context.dir, relPath)));

          // Skip package.json in files entry.
          continue;
        } catch (e) {
          console.warn("unable to parse package.json as JSON for signing");
        }
      }
      const hash = await sha512OfFile(pathJoin(context.dir, relPath));
      entries.push({
        path: normalisedPath,
        sha512: hash
      });
    }

    return {
      files: entries
    };
  },

  verifyEntry: async (
    context: IVerifyEntryContext,
    value: FilesEntry
  ): Promise<ModuleVerificationResult | null> => {
    const skipPackageJsonExactVerification = context.entries.some(x => {
      return (
        x.entry === "packageJson/v1alpha2" ||
        x.entry === "npmCompatiblePackageJson/v1alpha2"
      );
    });

    // For each relative file on disk, make sure it appears in
    // the list of files the signature is signing for.
    for (let relFileOnDisk of context.relFilesOnDisk) {
      let normalisedPath = relFileOnDisk.replace(/\\/g, "/");
      if (normalisedPath == "signature.json") {
        continue;
      }
      if (
        normalisedPath == "package.json" &&
        skipPackageJsonExactVerification
      ) {
        continue;
      }

      let found = false;
      let expectedHash = null;
      for (let expectedFile of value.files) {
        if (expectedFile.path == normalisedPath) {
          found = true;
          expectedHash = expectedFile.sha512;
        }
      }

      if (!found) {
        return generateCompromisedVerificationResult(
          context,
          normalisedPath +
            " exists in the package, but was not in the signature"
        );
      }

      const hash = await sha512OfFile(pathJoin(context.dir, normalisedPath));
      if (hash != expectedHash) {
        return generateCompromisedVerificationResult(
          context,
          normalisedPath +
            " does not have content that was signed for (mismatched hash)"
        );
      }
    }

    // For each file in the signature, make sure it appears in expected files.
    // We don't need to hash here because if there is a match we will have already
    // checked it in the for loop above.
    for (let fileEntry of value.files) {
      if (fileEntry.path == "signature.json") {
        continue;
      }

      let found = false;
      for (let relFileOnDisk of context.relFilesOnDisk) {
        let normalisedPath = relFileOnDisk.replace(/\\/g, "/");
        if (normalisedPath == fileEntry.path) {
          found = true;
        }
      }

      if (!found) {
        return generateCompromisedVerificationResult(
          context,
          fileEntry.path +
            " is expected by the signature, but is missing in the package"
        );
      }
    }

    // No invalidation of signature.
    return null;
  },

  toDeterministicString: (value: FilesEntry): string => {
    let deterministicString = "";
    for (let entry of value.files) {
      deterministicString += entry.path + "\n" + entry.sha512 + "\n";
    }
    return deterministicString;
  },

  getIdentity: (value: FilesEntry): SignatureIdentity | null => {
    // Does not provide identity information.
    return null;
  }
};
