import { SignatureIdentity } from "./deterministicSignature";
export interface Signer {
    getIdentity(): Promise<SignatureIdentity>;
    signEntries(deterministicSignature: string): Promise<string>;
}
