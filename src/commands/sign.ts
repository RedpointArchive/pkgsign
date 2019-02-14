import {
    Command,
    command,
    param,
    Options,
    option,
} from 'clime';
import * as path from 'path';
import { lstatSync } from 'fs';
import { unlinkPromise, recursivePromise, sha512OfFile, writeFilePromise, createWorkingDirectory, decompress, compress, readFilePromise } from '../lib/fsPromise';
import { Signer } from '../lib/signer';
import { KeybaseSigner } from '../lib/keybaseSigner';
import { PgpSigner } from '../lib/pgpSigner';
import * as packlist from 'npm-packlist';
import { SignatureFileEntry, SignatureFilesEntry } from '../lib/signature/signatureFilesEntry';
import { SignatureInfo, createDeterministicString } from '../lib/signature';
import { SignatureIdentityEntry } from '../lib/signature/signatureIdentityEntry';
import { queueTelemetry } from '../lib/telemetry';
import { identityToString } from '../lib/signature/signatureIdentity';
import { SignatureNpmCompatiblePackageJsonEntry } from '../lib/signature/signatureNpmCompatiblePackageJsonEntry';
import { SignaturePackageJsonEntry, stripNpmMetadataFieldFromPackageInfo } from '../lib/signature/signaturePackageJsonEntry';

export class SignOptions extends Options {
    @option({
        name: 'signer',
        description: 'the signer to use, one of: \'keybase\' (default) or \'pgp\'',
        default: 'keybase',
    })
    withSigner: string;
    @option({
        name: 'pgp-private-key-path',
        description: 'when signing with \'pgp\', this is the path to the private key file',
    })
    privateKeyPath: string;
    @option({
        name: 'pgp-private-key-passphrase',
        description: 'when signing with \'pgp\', this is the passphrase for the private key file',
    })
    privateKeyPassphrase: string;
    @option({
        name: 'pgp-public-key-https-url',
        description: 'when signing with \'pgp\', this is the HTTPS URL to the public key that pkgsign can download to verify the package',
    })
    publicKeyUrl: string;
}

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
        options: SignOptions
    ): Promise<void> {
        if (await this.executeInternal(path, options)) {
            process.exitCode = 0;
        } else {
            process.exitCode = 1;
        }
    }

    public async executeInternal(
        path: string,
        options: SignOptions
    ): Promise<boolean> {
        let signer: Signer;
        if (options.withSigner == 'pgp') {
            signer = new PgpSigner(
                options.privateKeyPath,
                options.privateKeyPassphrase,
                options.publicKeyUrl);
        } else if (options.withSigner == 'keybase') {
            signer = new KeybaseSigner();
        } else {
            throw new Error('Not supported signer type: ' + options.withSigner);
        }

        if (path.endsWith(".tgz") && lstatSync(path).isFile()) {
            return await this.signTarball(signer, path);
        } else {
            return await this.signDirectory(signer, path);
        }
    }

    private async signTarball(signer: Signer, tarballPath: string): Promise<boolean> {
        const wd = await createWorkingDirectory();
        console.log('extracting unsigned tarball...');
        await decompress(tarballPath, wd);

        console.log('building file list...');
        const base = path.join(wd, "package");
        let files = await recursivePromise(base);
        files = files.map(fullPath => fullPath.substr(base.length + 1));

        await this.signFileList(signer, base, files, 'sign-tarball');

        await unlinkPromise(tarballPath);
        await compress(wd, tarballPath);

        console.log('package tarball has been signed');
        return true;
    }

    private async signDirectory(signer: Signer, packagePath: string): Promise<boolean> {
        console.log('building file list...');
        const files = await packlist({
            path: packagePath
        });
        
        await this.signFileList(signer, packagePath, files, 'sign-directory');

        console.log('signature.json has been created in package directory');
        return true;
    }

    private async signFileList(signer: Signer, basePath: string, relativeFilePaths: string[], telemetryAction: string): Promise<void> {
        let packageInfo: any | null | undefined = null;
        let strippedPackageInfo: any | null | undefined = null;
        let entries: SignatureFileEntry[] = [];
        for (let relPath of relativeFilePaths) {
            const normalisedPath = relPath.replace(/\\/g, '/');
            if (normalisedPath == 'signature.json') {
                // This file might be included in the Git repo to sign the contents of the
                // latest commit against Keybase or PGP, but it should never be included
                // in the signature (because we're about to replace it in the signed package
                // anyway).
                continue;
            }
            if (normalisedPath == 'package.json') {
                // This file will be included in it's own package entry.
                const packageJson = await readFilePromise(path.join(basePath, relPath));
                try {
                    packageInfo = JSON.parse(packageJson);
                    strippedPackageInfo = { ...packageInfo };
                    // Strip NPM metadata from package.json.
                    stripNpmMetadataFieldFromPackageInfo(strippedPackageInfo);
                    
                    continue;
                } catch (e) {
                    console.warn('unable to parse package.json as JSON for signing');
                    packageInfo = undefined; /* do not include package json signature entry, so file validation will fallback to exact match */
                }
            }
            const hash = await sha512OfFile(path.join(basePath, relPath));
            entries.push({
                path: normalisedPath,
                sha512: hash,
            });
        }

        console.log('obtaining identity...');
        const identity = await signer.getIdentity();

        // Queue telemetry if needed.
        if (packageInfo != null && packageInfo.name != undefined) {
            if (packageInfo.private != true) {
                // This is not a private package, so record telemetry with the package
                // name included.
                await queueTelemetry({
                    action: telemetryAction,
                    packageName: packageInfo.name,
                    packageVersion: packageInfo.version || '',
                    packageIsSigned: true,
                    signingIdentity: identityToString(identity),
                    identityIsTrusted: true,
                });
            } else {
                // Private package, don't include any package information.
                await queueTelemetry({
                    action: telemetryAction,
                    packageName: '',
                    packageVersion: '',
                    packageIsSigned: true,
                    signingIdentity: '',
                    identityIsTrusted: true,
                });
            }
        } else {
            // Can't read package.json or it doesn't exist - don't include
            // any package information.
            await queueTelemetry({
                action: telemetryAction,
                packageName: '',
                packageVersion: '',
                packageIsSigned: true,
                signingIdentity: '',
                identityIsTrusted: true,
            });
        }

        console.log('creating signature...');
        const signatureDocument: SignatureInfo = {
            entries: [
                new SignatureFilesEntry({
                    files: entries,
                }),
                new SignatureIdentityEntry({
                    identity: identity,
                }),
                ...(packageInfo === undefined ? [] : [
                    new SignaturePackageJsonEntry({
                        packageJson: strippedPackageInfo,
                    }),
                    new SignatureNpmCompatiblePackageJsonEntry({
                        packageJsonProperties: Object.keys(packageInfo).sort(),
                        sha512: await SignatureNpmCompatiblePackageJsonEntry.sha512OfObject(packageInfo, Object.keys(packageInfo))
                    })
                ]),
            ],
            signature: '',
        };

        console.log('creating deterministic string...');
        const deterministicString = createDeterministicString(signatureDocument);

        console.log('signing deterministic string...');
        signatureDocument.signature = await signer.signEntries(deterministicString);

        const signatureDocumentJson = JSON.stringify(signatureDocument, null, 2);
        await writeFilePromise(path.join(basePath, 'signature.json'), signatureDocumentJson);
    }
}