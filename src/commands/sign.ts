import {
    Command,
    command,
    param,
} from 'clime';
import * as cmd from 'node-cmd';
import * as path from 'path';
import { lstatSync, unlinkSync } from 'fs';
import { unlinkPromise, recursivePromise, sha512OfFile, writeFilePromise, createWorkingDirectory, decompress, compress } from '../lib/fsPromise';
import { SignatureFileEntry, createSignatureFromEntries, SignatureInfo } from '../lib/deterministicSignature';
import { Signer } from '../lib/signer';
import { KeybaseSigner } from '../lib/keybaseSIgner';
import { PgpSigner } from '../lib/pgpSigner';
import * as packlist from 'npm-packlist';
  
@command({
    description: 'sign an npm/yarn package directory or tarball',
})
export default class extends Command {
    public async execute(
        @param({
            name: 'pkgdir|tarball',
            description: 'path to package directory or tarball',
            required: true,
        })
        path: string,
        @param({
            name: '--signer',
            description: 'the signer to use, one of: \'keybase\' (default) or \'pgp\'',
            default: 'keybase',
        })
        withSigner: string,
        @param({
            name: '--pgp-private-key-path',
            description: 'when signing with \'pgp\', this is the path to the private key file',
        })
        privateKeyPath: string,
        @param({
            name: '--pgp-private-key-passphrase',
            description: 'when signing with \'pgp\', this is the passphrase for the private key file',
        })
        privateKeyPassphrase: string,
        @param({
            name: '--pgp-public-key-https-url',
            description: 'when signing with \'pgp\', this is the HTTPS URL to the public key that pkgsign can download to verify the package',
        })
        publicKeyUrl: string
    ) {
        let signer: Signer;
        if (withSigner == 'pgp') {
            signer = new PgpSigner(
                privateKeyPath,
                privateKeyPassphrase,
                publicKeyUrl);
        } else if (withSigner == 'keybase') {
            signer = new KeybaseSigner();
        } else {
            throw new Error('Not supported signer type: ' + withSigner);
        }

        if (path.endsWith(".tgz") && lstatSync(path).isFile()) {
            await this.signTarball(signer, path);
        } else {
            await this.signDirectory(signer, path);
        }
    }

    private async signTarball(signer: Signer, tarballPath: string): Promise<void> {
        const wd = await createWorkingDirectory();
        console.log('extracting unsigned tarball...');
        await decompress(tarballPath, wd);

        console.log('building file list...');
        const base = path.join(wd, "package");
        const files = await recursivePromise(base);
        let entries: SignatureFileEntry[] = [];
        for (let fullPath of files) {
            const hash = await sha512OfFile(fullPath);
            const normalisedPath = fullPath.substr(base.length + 1).replace(/\\/g, '/');
            if (normalisedPath == 'signature.json') {
                // This file might be included in the Git repo to sign the contents of the
                // latest commit against Keybase or PGP, but it should never be included
                // in the signature (because we're about to replace it in the signed package
                // anyway).
                continue;
            }
            entries.push({
                path: normalisedPath,
                sha512: hash,
            });
        }

        console.log('creating deterministic signature...');
        const signatureToSign = createSignatureFromEntries(entries);

        console.log('creating signature document...');
        const identity = await signer.getIdentity();
        const signatureDocument: SignatureInfo = {
            version: 'v1alpha',
            files: entries,
            signature: await signer.signEntries(signatureToSign),
            identity: identity,
        };

        const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
        await writeFilePromise(path.join(wd, 'package', 'signature.json'), signatureDocumentJson);

        await unlinkPromise(tarballPath);
        await compress(wd, tarballPath);

        console.log('package tarball has been signed');
    }

    private async signDirectory(signer: Signer, packagePath: string): Promise<void> {
        console.log('building file list...');
        const files = await packlist({
            path: packagePath
        });
        let entries: SignatureFileEntry[] = [];
        for (let relPath of files) {
            const hash = await sha512OfFile(path.join(packagePath, relPath));
            const normalisedPath = relPath.replace(/\\/g, '/');
            if (normalisedPath == 'signature.json') {
                // This file might be included in the Git repo to sign the contents of the
                // latest commit against Keybase or PGP, but it should never be included
                // in the signature (because we're about to replace it in the signed package
                // anyway).
                continue;
            }
            entries.push({
                path: normalisedPath,
                sha512: hash,
            });
        }

        console.log('creating deterministic signature...');
        const signatureToSign = createSignatureFromEntries(entries);

        console.log('creating signature document...');
        const identity = await signer.getIdentity();
        const signatureDocument: SignatureInfo = {
            version: 'v1alpha',
            files: entries,
            signature: await signer.signEntries(signatureToSign),
            identity: identity,
        };

        const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
        await writeFilePromise(path.join(packagePath, 'signature.json'), signatureDocumentJson);

        console.log('signature.json has been created in package directory');
    }
}