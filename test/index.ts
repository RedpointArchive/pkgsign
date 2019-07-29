import test from "ava";
import * as fs from "fs";
import * as path from "path";
import SignCommand, { SignOptions } from "../src/commands/sign";
import VerifyCommand, { VerifyOptions } from "../src/commands/verify";
import { readFilePromise } from "../src/lib/util/fsPromise";
import { Entry } from "../src/lib/types";
import { FileEntry } from "../src/lib/entryHandlers/filesEntryHandler";

process.chdir(__dirname);

async function sign(testName: string): Promise<boolean> {
  const cmd = new SignCommand();
  const opts = new SignOptions();
  opts.withSigner = "pgp";
  opts.privateKeyPath = path.join(__dirname, "test.key");
  opts.privateKeyPassphrase = "";
  opts.publicKeyUrl = "https://pkgsign.test.invalid.url/test.pub";
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

function jsonParse(signatureJson: string): { entries: Entry<any>[] } {
  return JSON.parse(signatureJson);
}

test("signature has packageJson entry present", async t => {
  const testName = "signature-has-packageJson-entry-present";
  t.true(await sign(testName));
  t.true(
    fs.existsSync(path.join(testName, "signature.json")),
    "signature.json is not present"
  );
  const json = jsonParse(
    await readFilePromise(path.join(testName, "signature.json"))
  );
  t.true(
    json.entries.some(
      (entry: Entry<any>) => entry.entry === "packageJson/v1alpha2"
    )
  );
  t.true(
    json.entries.some(
      (entry: Entry<any>) => entry.entry === "npmCompatiblePackageJson/v1alpha2"
    )
  );
});

test("signature packageJson omits NPM fields on sign", async t => {
  const testName = "signature-packageJson-omits-npm-on-sign";
  t.true(await sign(testName));
  t.true(
    fs.existsSync(path.join(testName, "signature.json")),
    "signature.json is not present"
  );
  const json = jsonParse(
    await readFilePromise(path.join(testName, "signature.json"))
  );
  t.true(
    json.entries.some(
      (entry: Entry<any>) => entry.entry === "npmCompatiblePackageJson/v1alpha2"
    )
  );
  t.true(
    json.entries.some(
      (entry: Entry<any>) => entry.entry === "packageJson/v1alpha2"
    )
  );

  const npmCompatibleEntry = json.entries.filter(
    (entry: Entry<any>) => entry.entry === "npmCompatiblePackageJson/v1alpha2"
  )[0];
  const packageJsonEntry = json.entries.filter(
    (entry: Entry<any>) => entry.entry === "packageJson/v1alpha2"
  )[0];

  t.not(
    npmCompatibleEntry,
    undefined,
    "signature.json does not contain npmCompatiblePackageJson/v1alpha2"
  );
  t.not(
    packageJsonEntry,
    undefined,
    "signature.json does not contain packageJson/v1alpha2"
  );

  t.not(
    npmCompatibleEntry.value.packageJsonProperties,
    undefined,
    "signature.json npmCompatiblePackageJson/v1alpha2 does not contain packageJsonProperties"
  );
  t.not(
    packageJsonEntry.value.packageJson,
    undefined,
    "signature.json packageJson/v1alpha2 does not contain packageJson"
  );

  t.is(
    npmCompatibleEntry.value.packageJsonProperties.sort().indexOf("_from"),
    -1,
    "signature.json npmCompatiblePackageJson/v1alpha2 contains _from property"
  );
  t.is(
    Object.keys(packageJsonEntry.value.packageJson).length,
    2,
    "signature.json packageJson/v1alpha2 doesn't contain all properties"
  );
});

test("signature packageJson omits NPM fields on verify", async t => {
  const testName = "signature-packageJson-omits-npm-on-verify";
  t.true(await verify(testName));
});

test("check signature of package", async t => {
  const testName = "npm-published/regular-pkg";

  // sign test package
  t.true(await sign(testName));
  const originalPackageSignature = jsonParse(
    await readFilePromise(path.join(testName, "signature.json"))
  );
  const originalPackageJson = JSON.parse(
    await readFilePromise(path.join(testName, "package.json"))
  );

  t.true(
    originalPackageSignature.entries.some(
      (entry: Entry<any>) => entry.entry === "files/v1alpha2"
    )
  );
  t.true(
    originalPackageSignature.entries.some(
      (entry: Entry<any>) => entry.entry === "identity/v1alpha2"
    )
  );
  t.true(
    originalPackageSignature.entries.some(
      (entry: Entry<any>) => entry.entry === "packageJson/v1alpha2"
    )
  );
  t.true(
    originalPackageSignature.entries.some(
      (entry: Entry<any>) => entry.entry === "npmCompatiblePackageJson/v1alpha2"
    )
  );

  // all files ignored, except the files in the resulting package
  const filesEntry = originalPackageSignature.entries.filter(
    (entry: Entry<any>) => entry.entry === "files/v1alpha2"
  )[0];
  t.is(
    filesEntry.value.files.length,
    2,
    "signature.json files/v1alpha2 has only 2 files"
  );
  t.true(
    filesEntry.value.files.some(
      (entry: FileEntry) => entry.path === "dist/index.js"
    )
  );
  t.true(
    filesEntry.value.files.some(
      (entry: FileEntry) => entry.path === "README.md"
    )
  );

  // all properties ignored, starting with underscore
  const npmCompatibleEntry = originalPackageSignature.entries.filter(
    (entry: Entry<any>) => entry.entry === "npmCompatiblePackageJson/v1alpha2"
  )[0];
  t.is(
    npmCompatibleEntry.value.packageJsonProperties.sort().indexOf("_ignored"),
    -1,
    "signature.json npmCompatiblePackageJson/v1alpha2 contains _ignored property"
  );

  const packageJsonEntry = originalPackageSignature.entries.filter(
    (entry: Entry<any>) => entry.entry === "packageJson/v1alpha2"
  )[0];
  t.deepEqual(
    packageJsonEntry.value.packageJson,
    originalPackageJson,
    "packageJson of packageJson/v1alpha2 doesn't match package.json from package"
  );

  const installedPackageJson = JSON.parse(
    await readFilePromise(
      path.join("npm-installed/regular-pkg", "package.json")
    )
  );
  // check for install metadata properties
  t.true(
    Object.keys(installedPackageJson).some(
      (entry: string) => entry.indexOf("_") === 0
    )
  );
  // check for autogenerated description from readme.md
  t.true(
    Object.keys(installedPackageJson).some(
      (entry: string) => entry.localeCompare("description") === 0
    )
  );
  t.is(
    installedPackageJson.description,
    "original example package as seen in any git repository",
    "package.json of installed package does not have auto-generated description field"
  );
});

test("verify valid signature of installed package", async t => {
  // the verification should only take into account the properties
  // directly set by the developer / package-owner
  t.true(await verify("npm-installed/regular-pkg"));

  // the verification should take every field into account
  t.true(await verify("yarn-installed/regular-pkg"));
});

test("fail verification on manipulated package content", async t => {
  // should fail to verify modified package.json
  t.false(await verify("npm-installed/regular-pkg-packageJson-modified"));
  t.false(await verify("yarn-installed/regular-pkg-packageJson-modified"));

  // should fail to verify modified code
  t.false(await verify("npm-installed/regular-pkg-code-modified"));
  t.false(await verify("yarn-installed/regular-pkg-code-modified"));
});
