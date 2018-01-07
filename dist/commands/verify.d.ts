import { Command, Options } from 'clime';
export declare class VerifyOptions extends Options {
    full: boolean;
    nonInteractive: boolean;
    packageName: string;
}
export default class  extends Command {
    execute(path: string, options: VerifyOptions): Promise<void>;
    private verifyTarball(tarballPath, options);
    private verifyDirectory(path, options);
}
