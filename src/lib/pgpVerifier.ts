import { Verifier } from "./verifier";
import { SignatureIdentity } from "./deterministicSignature";

export class PgpVerifier implements Verifier {
    public async verify(identity: SignatureIdentity, signature: string, deterministicSignature: string) {
        // not implemented yet!
        return false;
    }
}