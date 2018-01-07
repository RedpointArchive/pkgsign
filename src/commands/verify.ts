import {
    Command,
    command,
    param,
} from 'clime';
import { SignedPackage } from '../lib/signedPackage';
  
@command({
    description: 'verify an npm/yarn package directory',
})
export default class extends Command {
    public async execute(
        @param({
            description: 'path to package directory',
            required: true,
        })
        dir: string,
    ): Promise<void> {
        let signedPackage = new SignedPackage('.');
        let results = await signedPackage.verify();

        for (let result of results.unsigned) {
            console.log('[unsigned] ' + result.package.name + ' at ' + result.path + ': ' + result.reason);
        }
        for (let result of results.untrusted) {
            console.log('[untrusted] ' + result.package.name);
        }
        for (let result of results.trusted) {
            console.log('[trusted] ' + result.package.name);
        }

        if (results.unsigned.length > 0 || results.untrusted.length > 0) {
            process.exitCode = 1;
        }
    }
}