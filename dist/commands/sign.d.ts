import { Command, Options } from 'clime';
export declare class SignOptions extends Options {
    withSigner: string;
    privateKeyPath: string;
    privateKeyPassphrase: string;
    publicKeyUrl: string;
}
export default class  extends Command {
    execute(path: string, options: SignOptions): Promise<void>;
    executeInternal(path: string, options: SignOptions): Promise<boolean>;
    private signTarball(signer, tarballPath);
    private signDirectory(signer, packagePath);
    private signFileList(signer, basePath, relativeFilePaths, telemetryAction);
}
