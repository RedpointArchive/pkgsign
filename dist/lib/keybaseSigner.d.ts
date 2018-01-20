import { Signer } from "./signer";
import { SignatureIdentity } from './signature/signatureIdentity';
export declare class KeybaseSigner implements Signer {
    getIdentity(): Promise<SignatureIdentity>;
    signEntries(deterministicString: string): Promise<string>;
}
