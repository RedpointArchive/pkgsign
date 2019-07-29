import { Entry } from "./types";
import { availableEntryHandlersByName } from "./entryHandlers/registry";
import { IIdentityProvider, IIdentityProviderSigningContext } from "./identity";
import { writeFileSync } from "fs";

export async function createSignedSignatureDocument(
  entries: Entry<any>[],
  identityProvider: IIdentityProvider,
  identityProviderContext: IIdentityProviderSigningContext
): Promise<string> {
  const signatureDocument = {
    entries,
    signature: ""
  };

  let deterministicString = "";
  for (const entry of entries) {
    deterministicString += entry.entry + "\n";
    const handler = availableEntryHandlersByName.get(entry.entry);
    if (handler === undefined) {
      throw new Error(
        "can not build deterministic string with unknown handler"
      );
    }
    deterministicString +=
      handler.toDeterministicString(entry.value).trim() + "\n";
  }

  signatureDocument.signature = await identityProvider.signEntries(
    identityProviderContext,
    deterministicString
  );

  return JSON.stringify(signatureDocument, null, 2);
}

export interface UnverifiedSignatureDocument {
  entries: Entry<any>[];
  signature: string;
  locallyComputedDeterministicString: string;
}

export async function readUnverifiedSignatureDocument(
  documentContent: string
): Promise<UnverifiedSignatureDocument> {
  const signatureDocument = JSON.parse(documentContent) as {
    entries: Entry<any>[];
    signature: string;
  };

  let deterministicString = "";
  for (const entry of signatureDocument.entries) {
    deterministicString += entry.entry + "\n";
    const handler = availableEntryHandlersByName.get(entry.entry);
    if (handler === undefined) {
      throw new Error(
        "can not build deterministic string with unknown handler"
      );
    }
    deterministicString +=
      handler.toDeterministicString(entry.value).trim() + "\n";
  }

  return {
    entries: signatureDocument.entries,
    signature: signatureDocument.signature,
    locallyComputedDeterministicString: deterministicString
  };
}
