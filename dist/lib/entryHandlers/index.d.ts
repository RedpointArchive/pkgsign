import { ModuleVerificationResult, SignatureIdentity, IVerifyEntryContext, IGenerateEntryContext } from "../types";
export interface IEntryHandler<T> {
    /**
     * Returns the entry type specified, such as `files/v1alpha1` that
     * identifies the type of entries this implementation handles
     * in `signature.json`.
     */
    getEntryType(): string;
    /**
     * `generateContent` is responsible for generating an entry value
     * for `signature.json`, based on the on-disk content. If this method
     * returns null, an entry is not included in `signature.json`.
     *
     * @param context The entry generation context.
     */
    generateEntry(context: IGenerateEntryContext): Promise<T | null>;
    /**
     * `verifyEntry` is responsible for verifying on-disk content against the
     * entry in `value`. It is not responsible for verifying the overall
     * signature of a package.
     *
     * Instead, this should contain work such as verifying that files match
     * their SHA512 hashes, where those hashes are then part of the value that
     * `toDeterministicString` returns (whose result becomes part of the message
     * that is signed / verified by pkgsign).
     *
     * @param context The verification context.
     * @param value The entry data, as it appears in `signature.json`.
     */
    verifyEntry(context: IVerifyEntryContext, value: T): Promise<ModuleVerificationResult | null>;
    /**
     * Converts the values inside `value` into a deterministic string, which is
     * then signed or verified by pkgsign.
     *
     * @param value The entry data, as it appears in `signature.json`.
     */
    toDeterministicString(value: T): string;
    /**
     * If this signature entry provides identity information, returns the
     * identity that signed the package.
     *
     * @param value The entry data, as it appears in `signature.json`.
     */
    getIdentity(value: T): SignatureIdentity | null;
}
/**
 * `generateCompromisedVerificationResult` returns a verification result with the
 * status Compromised and the specified message. Helps keep the `verifyContent`
 * of entry handlers shorter by copying across all the boilerplate to the result.
 *
 * @param context The verification context.
 * @param msg The message to attach to the verification result.
 */
export declare function generateCompromisedVerificationResult(context: IVerifyEntryContext, msg: string): ModuleVerificationResult;
