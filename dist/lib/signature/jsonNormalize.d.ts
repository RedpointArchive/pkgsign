/**
 * Exported wrapper around the serialize function.
 * @param {object} obj The object to serialize.
 * @param {function=} replacer A function that's called for each item, like the replacer
 * function passed to JSON.stringify.
 * @param {function} complete A callback for completion.
 * @returns {undefined}
 */
export declare function normalize(obj: any, replacer: any, complete: any): void;
/**
 * Exported wrapper around the serializeSync function.
 * @param {object} obj The object to serialize.
 * @param {function=} replacer A function that's called for each item, like the replacer
 * function passed to JSON.stringify.
 * @returns {string} A "normalized JSON string", which always returns the same string, if passed
 * the same object, regardless of key order.
 */
export declare function normalizeSync(obj: any, replacer?: any): any;
