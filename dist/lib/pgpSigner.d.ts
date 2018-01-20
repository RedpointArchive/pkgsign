import { Signer } from "./signer";
import { SignatureIdentity } from "./signature/signatureIdentity";
export declare class PgpSigner implements Signer {
    private privateKeyPath;
    private privateKeyPassphrase;
    private publicKeyHttpsUrl;
    constructor(privateKeyPath: string, privateKeyPassphrase: string, publicKeyHttpsUrl: string);
    getIdentity(): Promise<SignatureIdentity>;
    signEntries(deterministicString: string): Promise<string>;
}
