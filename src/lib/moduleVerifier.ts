import * as path from "path";
import { ITrustStore } from "./trustStore";
import {
  ModuleVerificationResult,
  ModuleVerificationStatus,
  SignatureIdentity
} from "./types";
import { readFilePromise } from "./util/fsPromise";
import {
  UnverifiedSignatureDocument,
  readUnverifiedSignatureDocument
} from "./signature";
import { availableEntryHandlersByName } from "./entryHandlers/registry";
import { IIdentityProvider } from "./identity";
import { KeybaseIdentityProvider } from "./identity/keybase";
import { PgpIdentityProvider } from "./identity/pgp";

export class ModuleVerifier {
  constructor(private trustStore: ITrustStore) {}

  public async verify(
    dir: string,
    relFilesOnDisk: string[],
    expectedPackageName: string
  ): Promise<ModuleVerificationResult> {
    // Try to read whether or not the module is private early so we
    // can return the information to the caller. This field is untrusted, and
    // is only used by telemetry when determining the amount of data to send.
    let isPrivate = true;
    let untrustedPackageVersion = "";
    let earlyPackageInfo;
    try {
      earlyPackageInfo = JSON.parse(
        await readFilePromise(path.join(dir, "package.json"))
      );
      isPrivate = earlyPackageInfo.private || false;
      untrustedPackageVersion = earlyPackageInfo.version || "";
    } catch (e) {}

    // Load the signature document.
    let signature: UnverifiedSignatureDocument;
    try {
      const rawJson = await readFilePromise(path.join(dir, "signature.json"));
      signature = await readUnverifiedSignatureDocument(rawJson);
    } catch (e) {
      return {
        status: ModuleVerificationStatus.Unsigned,
        reason: "Missing or unparsable signature.json",
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate
      };
    }

    // If the document has any entries that we don't recognise, we can't
    // validate the document.
    for (const entry of signature.entries) {
      const hasHandler = availableEntryHandlersByName.has(entry.entry);
      if (!hasHandler) {
        return {
          status: ModuleVerificationStatus.Compromised,
          reason: `Unrecognised entry in signature.json: '${entry.entry}' (try upgrading pkgsign)`,
          packageName: expectedPackageName,
          untrustedPackageVersion: untrustedPackageVersion,
          isPrivate: isPrivate
        };
      }
    }

    // Find an entry that provides an identity.
    let identity: SignatureIdentity | null = null;
    for (let entry of signature.entries) {
      const handler = availableEntryHandlersByName.get(entry.entry);
      const localIdentity = handler.getIdentity(entry.value);
      if (localIdentity !== null) {
        identity = localIdentity;
        break;
      }
    }
    if (identity === null) {
      return {
        status: ModuleVerificationStatus.Compromised,
        reason: "No identity information in signature.json",
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate
      };
    }

    // Now we know the package contents matches the files expected by the signature, and all
    // of the hashes match, but now we need to locate the public keys for the signature so
    // we can verify it.
    let identityProvider: IIdentityProvider;
    if (identity.keybaseUser !== undefined) {
      identityProvider = KeybaseIdentityProvider;
    } else if (identity.pgpPublicKeyUrl !== undefined) {
      identityProvider = PgpIdentityProvider;
    } else {
      return {
        status: ModuleVerificationStatus.Compromised,
        reason: "Unknown identity in signature.json",
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate
      };
    }

    // Verify each of the entries.
    const context = {
      dir: dir,
      relFilesOnDisk: relFilesOnDisk,
      expectedPackageName: expectedPackageName,
      untrustedIdentity: identity,
      untrustedPackageVersion: untrustedPackageVersion,
      isPrivate: isPrivate,
      entries: signature.entries
    };
    for (const entry of signature.entries) {
      const handler = availableEntryHandlersByName.get(entry.entry);
      const entryResult = await handler.verifyEntry(context, entry.value);
      if (entryResult !== null) {
        return entryResult;
      }
    }

    // Request the verifier verify the signature.
    if (
      !(await identityProvider.verify(
        {
          trustStore: this.trustStore
        },
        identity,
        signature.signature,
        signature.locallyComputedDeterministicString
      ))
    ) {
      return {
        status: ModuleVerificationStatus.Compromised,
        reason: "The signature does not match",
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate,
        untrustedIdentity: identity
      };
    }

    // Check the package name in package.json matches the expected
    // package name that was provided.
    let packageInfo: any = null;
    try {
      packageInfo = JSON.parse(
        await readFilePromise(path.join(dir, "package.json"))
      );
    } catch (e) {
      return {
        status: ModuleVerificationStatus.Compromised,
        reason: "Missing or unparsable package.json",
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate,
        untrustedIdentity: identity
      };
    }

    if (
      packageInfo == null ||
      (packageInfo.name || "") != expectedPackageName
    ) {
      return {
        status: ModuleVerificationStatus.Compromised,
        reason:
          "Provided package name in package.json did not match expected package name",
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate,
        untrustedIdentity: identity
      };
    }

    // Package signature is valid, now we need to see if the identity
    // is trusted for the given package name.
    if (await this.trustStore.isTrusted(identity, expectedPackageName)) {
      return {
        status: ModuleVerificationStatus.Trusted,
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate,
        trustedIdentity: identity
      };
    } else {
      return {
        status: ModuleVerificationStatus.Untrusted,
        untrustedIdentity: identity,
        packageName: expectedPackageName,
        untrustedPackageVersion: untrustedPackageVersion,
        isPrivate: isPrivate
      };
    }
  }
}
