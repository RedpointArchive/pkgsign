import { IEntryHandler } from ".";
import { SignatureIdentity } from "../types";
interface IdentityEntry {
    identity: SignatureIdentity;
}
export declare const IdentityEntryHandler: IEntryHandler<IdentityEntry>;
export {};
