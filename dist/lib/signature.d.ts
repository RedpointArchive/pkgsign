import { Entry } from "./types";
import { IIdentityProvider, IIdentityProviderSigningContext } from "./identity";
export declare function createSignedSignatureDocument(entries: Entry<any>[], identityProvider: IIdentityProvider, identityProviderContext: IIdentityProviderSigningContext): Promise<string>;
export interface UnverifiedSignatureDocument {
    entries: Entry<any>[];
    signature: string;
    locallyComputedDeterministicString: string;
}
export declare function readUnverifiedSignatureDocument(documentContent: string): Promise<UnverifiedSignatureDocument>;
