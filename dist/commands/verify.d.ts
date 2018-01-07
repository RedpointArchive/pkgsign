import { Command, Options } from 'clime';
export declare class VerifyOptions extends Options {
    full: boolean;
}
export default class  extends Command {
    execute(path: string, options: VerifyOptions): Promise<void>;
    private verifyTarball(tarballPath);
    private verifyDirectory(path, full);
}
