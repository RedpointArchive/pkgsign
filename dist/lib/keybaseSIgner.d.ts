import { Signer } from "./signer";
import { SignatureIdentity } from "./deterministicSignature";
export declare class KeybaseSigner implements Signer {
    getIdentity(): Promise<SignatureIdentity>;
    signEntries(deterministicSignature: string): Promise<string>;
}
