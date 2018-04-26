import test from 'ava';
import * as fs from 'fs';
import * as path from 'path';
import SignCommand, { SignOptions } from '../src/commands/sign';
import VerifyCommand, { VerifyOptions } from '../src/commands/verify';
import { readFilePromise } from '../src/lib/fsPromise';

process.chdir(__dirname);

async function sign(testName: string): Promise<boolean> {
  const cmd = new SignCommand();
  const opts = new SignOptions();
  opts.withSigner = 'pgp';
  opts.privateKeyPath = path.join(__dirname, 'test.key');
  opts.privateKeyPassphrase = '';
  opts.publicKeyUrl = 'https://pkgsign.test.invalid.url/test.pub';
  return await cmd.executeInternal(testName, opts);
}

async function verify(testName: string): Promise<boolean> {
  const cmd = new VerifyCommand();
  const opts = new VerifyOptions();
  opts.nonInteractive = true;
  opts.full = false;
  opts.packageName = testName;
  opts.enableTestTrustStore = true;
  return await cmd.executeInternal(testName, opts);
}

test('signature has packageJson entry present', async t => {
  const testName = 'signature-has-packageJson-entry-present';
  t.true(await sign(testName));
  t.true(fs.existsSync(path.join(testName, 'signature.json')), 'signature.json is not present');
  const json = JSON.parse(await readFilePromise(path.join(testName, 'signature.json')));
  t.true(json.entries.some(entry => entry.entry === 'packageJson/v1alpha1'));
});

test('signature packageJson omits NPM fields on sign', async t => {
  const testName = 'signature-packageJson-omits-npm-on-sign';
  t.true(await sign(testName));
  t.true(fs.existsSync(path.join(testName, 'signature.json')), 'signature.json is not present');
  const json = JSON.parse(await readFilePromise(path.join(testName, 'signature.json')));
  t.true(json.entries.some(entry => entry.entry === 'packageJson/v1alpha1'));
  const entry = json.entries.filter(entry => entry.entry === 'packageJson/v1alpha1')[0];
  t.is(entry.packageJson._from, undefined, 'signature.json packageJson/v1alpha1 contains _from field');
});

test('signature packageJson omits NPM fields on verify', async t => {
  const testName = 'signature-packageJson-omits-npm-on-verify';
  t.true(await verify(testName));
});