import { Entry } from "./types";
import { availableEntryHandlersByName } from "./entryHandlers/registry";
import { IIdentityProvider, IIdentityProviderSigningContext } from "./identity";

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
    deterministicString +=
      availableEntryHandlersByName
        .get(entry.entry)
        .toDeterministicString(entry.value)
        .trim() + "\n";
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
    deterministicString +=
      availableEntryHandlersByName
        .get(entry.entry)
        .toDeterministicString(entry.value)
        .trim() + "\n";
  }

  return {
    entries: signatureDocument.entries,
    signature: signatureDocument.signature,
    locallyComputedDeterministicString: deterministicString
  };
}
