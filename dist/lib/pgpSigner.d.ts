import { Signer } from "./signer";
import { SignatureIdentity } from "./deterministicSignature";
export declare class PgpSigner implements Signer {
    private privateKeyPath;
    private privateKeyPassphrase;
    private publicKeyHttpsUrl;
    constructor(privateKeyPath: string, privateKeyPassphrase: string, publicKeyHttpsUrl: string);
    getIdentity(): Promise<SignatureIdentity>;
    signEntries(deterministicSignature: string): Promise<string>;
}
