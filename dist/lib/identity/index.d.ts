import { SignatureIdentity } from "../types";
import { ITrustStore } from "../trustStore";
export interface IIdentityProviderSigningContext {
    privateKeyPath: string;
    privateKeyPassphrase: string;
    publicKeyHttpsUrl: string;
}
export interface IIdentityProviderVerificationContext {
    trustStore: ITrustStore;
}
export interface IIdentityProvider {
    getIdentity(context: IIdentityProviderSigningContext): Promise<SignatureIdentity>;
    signEntries(context: IIdentityProviderSigningContext, deterministicString: string): Promise<string>;
    verify(context: IIdentityProviderVerificationContext, identity: SignatureIdentity, signature: string, deterministicString: string): Promise<boolean>;
}
