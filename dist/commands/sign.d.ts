import { Command } from 'clime';
export default class  extends Command {
    execute(path: string, withSigner: string, privateKeyPath: string, privateKeyPassphrase: string, publicKeyUrl: string): Promise<void>;
    private signTarball(signer, tarballPath);
    private signDirectory(signer, packagePath);
}
