import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import * as openpgp from 'openpgp';
import { SignatureFileEntry, createSignatureFromEntries, SignatureInfo } from './deterministicSignature';
import { readFilePromise, readdirPromise } from './fsPromise';
import { ModuleVerificationResult, ModuleVerifier } from './moduleVerifier';
import { TrustStore } from './trustStore';
import * as packlist from 'npm-packlist';

export interface ModuleInfo {
    untrustedPackageInfo: any;
    path: string;
}

export class ModuleHierarchyVerifier {
    constructor(private dir: string) { }

    public async verify(): Promise<{ [path: string]: ModuleVerificationResult }> {
        // build up a list of node modules we need to verify, based on the current directory
        const modules = await this.findModules(this.dir);
        modules.push({
            untrustedPackageInfo: JSON.parse(await readFilePromise(path.join(this.dir, 'package.json'))),
            path: this.dir,
        });

        let promises: Promise<void>[] = [];
        let trustStore = new TrustStore();
        let moduleVerifier = new ModuleVerifier(trustStore);
        let results: { [path: string]: ModuleVerificationResult } = {};
        for (let moduleInfo of modules) {
            promises.push((async (moduleInfo) => {
                let expectedPackageName = path.basename(moduleInfo.path);
                if (expectedPackageName == '.') {
                    // This is the top-level module we want to verify. Because this module might be
                    // cloned by the user with Git into a directory name that doesn't match, we
                    // trust package.json for the expected package name instead.
                    expectedPackageName = moduleInfo.untrustedPackageInfo.name;
                }
                let result = await moduleVerifier.verify(
                    moduleInfo.path,
                    await packlist({path: moduleInfo.path}),
                    expectedPackageName
                );
                results[moduleInfo.path] = result;
            })(moduleInfo));
        }
        await Promise.all(promises);

        return results;
    }

    private async findModules(dir: string): Promise<ModuleInfo[]> {
        let resultModules: ModuleInfo[] = [];
        let ourModules: string[] = [];
        try {
            ourModules = await readdirPromise(path.join(dir, 'node_modules'));
        } catch (e) {
            if (e && e.code == 'ENOENT') {
                // this package has no child modules.
            } else if (e && e.code == 'ENOTDIR') {
                // this is not a package (e.g. .yarn-integrity file)
            } else {
                throw e;
            }
        }
        for (let otherModule of ourModules) {
            if (otherModule[0] == '@') {
                // this is a namespace folder, iterate through it instead.
                const nsModules = await readdirPromise(path.join(dir, 'node_modules', otherModule));
                for (let nsModule of nsModules) {
                    const theirModules = await this.findModules(path.join(dir, 'node_modules', otherModule, nsModule));
                    resultModules.push(...theirModules);
                }
            } else {
                const theirModules = await this.findModules(path.join(dir, 'node_modules', otherModule));
                resultModules.push(...theirModules);
            }

            if (otherModule[0] != '.' && otherModule[0] != '@') {
                resultModules.push({
                    untrustedPackageInfo: JSON.parse(await readFilePromise(path.join(dir, 'node_modules', otherModule, 'package.json'))),
                    path: path.join(dir, 'node_modules', otherModule),
                });
            }
        }
        return resultModules;
    }

}