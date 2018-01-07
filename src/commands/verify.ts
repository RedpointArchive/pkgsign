import {
    Command,
    command,
    param,
    option,
    Options,
} from 'clime';
import { lstatSync } from 'fs';
import { ModuleHierarchyVerifier } from '../lib/moduleHierarchyVerifier';
import { ModuleVerificationStatus, ModuleVerifier } from '../lib/moduleVerifier';
import * as prompt from 'prompt';
import * as path from 'path';
import { basename } from 'path';
import { TrustStore } from '../lib/trustStore';
import { createWorkingDirectory, decompress, recursivePromise, readFilePromise } from '../lib/fsPromise';

export class VerifyOptions extends Options {
    @option({
        name: 'full',
        toggle: true,
        description: 'show verification status of individual packages',
    })
    full: boolean;
    @option({
        name: 'non-interactive',
        toggle: true,
        description: 'do not prompt to trust packages that are untrusted',
    })
    nonInteractive: boolean;
    @option({
        name: 'package-name',
        description: 'if verifying a tarball, this is the expected package name',
    })
    packageName: string;
}

@command({
    description: 'verify an npm/yarn package directory',
})
export default class extends Command {
    public async execute(
        @param({
            name: 'pkgdir|tarball',
            description: 'path to package directory or tarball',
            required: true,
        })
        path: string,
        options: VerifyOptions,
    ): Promise<void> {
        if (path.endsWith(".tgz") && lstatSync(path).isFile()) {
            await this.verifyTarball(path, options);
        } else {
            await this.verifyDirectory(path, options);
        }
    }

    private async verifyTarball(tarballPath: string, options: VerifyOptions): Promise<void> {
        const wd = await createWorkingDirectory();
        console.log('extracting unsigned tarball...');
        await decompress(tarballPath, wd);

        console.log('building file list...');
        const base = path.join(wd, "package");
        const files = (await recursivePromise(base)).map((fullPath) => fullPath.substr(base.length + 1).replace(/\\/g, '/'));

        console.log('verifying package...');
        const moduleVerifier = new ModuleVerifier(new TrustStore());
        let result = await moduleVerifier.verify(base, files, options.packageName || '');

        // Prompt user to trust package if untrusted.
        if (result.status == ModuleVerificationStatus.Untrusted && !options.nonInteractive) {
            prompt.start();
            let identityString = '';
            if (result.untrustedIdentity.keybaseUser !== undefined) {
                identityString = result.untrustedIdentity.keybaseUser + ' on keybase.io';
            } else {
                identityString = 'public key at ' + result.untrustedIdentity.pgpPublicKeyUrl;
            }
            const trustResults = await new Promise<any>((resolve, reject) => {
                prompt.get({
                    name: 'pkg',
                    type: 'boolean',
                    description: 'Package \'' + result.packageName + '\' is not trusted, but is signed by ' + identityString + '. ' + 
                        'Do you want to trust this identity to sign \'' + result.packageName + '\' now and forever',
                    required: true,
                    default: false
                }, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
            let trustStore = new TrustStore();
            let didModify = false;
            if (trustResults['pkg']) {
                await trustStore.addTrusted(
                    result.untrustedIdentity,
                    result.packageName
                );
                didModify = true;
            }

            result = await moduleVerifier.verify(base, files, options.packageName || '');
        }

        switch (result.status) {
            case ModuleVerificationStatus.Compromised:
                process.exitCode = 1;
                console.log('package is compromised: ' + result.reason);
                break;
            case ModuleVerificationStatus.Unsigned:
                process.exitCode = 1;
                console.log('package is unsigned: ' + result.reason);
                break;
            case ModuleVerificationStatus.Untrusted:
                process.exitCode = 1;
                console.log('package is untrusted');
                break;
            case ModuleVerificationStatus.Trusted:
                process.exitCode = 0;
                console.log('package is trusted');
                break;
        }
    }

    private async verifyDirectory(path: string, options: VerifyOptions): Promise<void> {
        let moduleHierarchyVerifier = new ModuleHierarchyVerifier(path);
        let results = await moduleHierarchyVerifier.verify();

        // First find any untrusted modules and ask the user if they
        // want to trust them.
        let promptStarted = false;
        let prompts = [];
        for (let path in results) {
            let result = results[path];
            if (result.status == ModuleVerificationStatus.Untrusted) {
                let identityString = '';
                if (result.untrustedIdentity.keybaseUser !== undefined) {
                    identityString = result.untrustedIdentity.keybaseUser + ' on keybase.io';
                } else {
                    identityString = 'public key at ' + result.untrustedIdentity.pgpPublicKeyUrl;
                }
                if (prompts.filter((value) => basename(value.name) == result.packageName).length == 0) {
                    prompts.push({
                        name: path,
                        type: 'boolean',
                        description: 'Package \'' + result.packageName + '\' is not trusted, but is signed by ' + identityString + '. ' + 
                            'Do you want to trust this identity to sign \'' + result.packageName + '\' now and forever',
                        required: true,
                        default: false
                    });
                }
            }
        }

        if (prompts.length > 0 && !options.nonInteractive) {
            prompt.start();
            let didModify = false;
            const trustResults = await new Promise<any>((resolve, reject) => {
                prompt.get(prompts, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
            let trustStore = new TrustStore();
            for (let path in trustResults) {
                if (trustResults[path]) {
                    await trustStore.addTrusted(
                        results[path].untrustedIdentity,
                        results[path].packageName
                    );
                    didModify = true;
                }
            }

            if (didModify) {
                // Recalculate results now that trust prompts have been answered.
                results = await moduleHierarchyVerifier.verify();
            }
        }

        // Show summary of packages.
        let compromisedCount = 0;
        let unsignedCount = 0;
        let untrustedCount = 0;
        let trustedCount = 0;
        
        for (let path in results) {
            let result = results[path];
            switch (result.status) {
                case ModuleVerificationStatus.Compromised:
                    compromisedCount++;
                    break;
                case ModuleVerificationStatus.Unsigned:
                    unsignedCount++;
                    break;
                case ModuleVerificationStatus.Untrusted:
                    untrustedCount++;
                    break;
                case ModuleVerificationStatus.Trusted:
                    trustedCount++;
                    break;
            }
        }

        console.log('package verification summary:')
        console.log(compromisedCount + ' compromised');
        console.log(unsignedCount + ' unsigned');
        console.log(untrustedCount + ' untrusted');
        console.log(trustedCount + ' trusted');

        if (options.full) {
            const padRight = (input: string) => {
                while (input.length < 25) {
                    input = input + ' ';
                }
                return input;
            }
            console.log();
            for (let path in results) {
                let result = results[path];
                let status = 'unknown';
                switch (result.status) {
                    case ModuleVerificationStatus.Compromised:
                        status = 'compromised!';
                        break;
                    case ModuleVerificationStatus.Unsigned:
                        status = 'unsigned';
                        break;
                    case ModuleVerificationStatus.Untrusted:
                        status = 'untrusted';
                        break;
                    case ModuleVerificationStatus.Trusted:
                        status = 'trusted';
                        break;
                }
                console.log(
                    padRight(results[path].packageName) + ' ' + 
                    padRight(status) + ' ' +
                    (result.reason || ''));
            }
        }
        
        if (compromisedCount > 0 || unsignedCount > 0 || untrustedCount > 0) {
            process.exitCode = 1;
        } else {
            process.exitCode = 0;
        }
    }
}