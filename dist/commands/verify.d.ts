import { Command, Options } from 'clime';
export declare class VerifyOptions extends Options {
    full: boolean;
    nonInteractive: boolean;
    packageName: string;
    enableTestTrustStore: boolean;
    allowUnsignedPackages: boolean;
}
export default class extends Command {
    execute(path: string, options: VerifyOptions): Promise<void>;
    executeInternal(path: string, options: VerifyOptions): Promise<boolean>;
    private verifyTarball;
    private verifyDirectory;
}
