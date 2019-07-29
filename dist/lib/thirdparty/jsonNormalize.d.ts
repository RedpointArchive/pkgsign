/**
 *
 * This file originates from json-normalize, which does not correctly ship files in dist/
 * suitable for distribution. It has runtime dependencies on Babel, which we don't want
 * to pull in.
 *
 * We've copied the implementation of json-normalize here, so that we can run it through
 * TypeScript along with the rest of our code.
 *
 * We've also removed the references to the 'crypto' module, and the associated functions
 * that depend on it, as we do not need this capability.
 *
 */
/**
 * Exported wrapper around the serialize function.
 * @param {object} obj The object to serialize.
 * @param {function=} replacer A function that's called for each item, like the replacer
 * function passed to JSON.stringify.
 * @param {function} complete A callback for completion.
 * @returns {undefined}
 */
export declare function normalize(obj: any, replacer: undefined | ((this: any, key: string, value: any) => any), complete: (err: any, value: string) => void): void;
/**
 * Exported wrapper around the serializeSync function.
 * @param {object} obj The object to serialize.
 * @param {function=} replacer A function that's called for each item, like the replacer
 * function passed to JSON.stringify.
 * @returns {string} A "normalized JSON string", which always returns the same string, if passed
 * the same object, regardless of key order.
 */
export declare function normalizeSync(obj: any, replacer?: (this: any, key: string, value: any) => any): string;
