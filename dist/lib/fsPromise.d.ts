export declare function readdirPromise(dir: string): Promise<string[]>;
export declare function writeFilePromise(file: string, content: string): Promise<void>;
export declare function readFilePromise(file: string): Promise<string>;
export declare function unlinkPromise(file: string): Promise<void>;
export declare function recursivePromise(path: any): Promise<string[]>;
export declare function sha512OfFile(path: any): Promise<string>;
export declare function createWorkingDirectory(): Promise<string>;
export declare function decompress(tarball: string, out: string): Promise<void>;
export declare function compress(indir: string, tarball: string): Promise<void>;
