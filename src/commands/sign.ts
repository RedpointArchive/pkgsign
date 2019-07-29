import { Command, command, param, Options, option } from "clime";
import * as path from "path";
import { lstatSync } from "fs";
import * as packlist from "npm-packlist";
import { createSignedSignatureDocument } from "../lib/signature";
import { queueTelemetryPackageAction } from "../lib/telemetry";
import { availableEntryHandlers } from "../lib/entryHandlers/registry";
import { Entry } from "../lib/types";
import {
  createWorkingDirectory,
  decompress,
  recursivePromise,
  unlinkPromise,
  compress,
  writeFilePromise
} from "../lib/util/fsPromise";
import {
  IIdentityProvider,
  IIdentityProviderSigningContext
} from "../lib/identity";
import { PgpIdentityProvider } from "../lib/identity/pgp";
import { KeybaseIdentityProvider } from "../lib/identity/keybase";

export class SignOptions extends Options {
  @option({
    name: "signer",
    description: "the signer to use, one of: 'keybase' (default) or 'pgp'",
    default: "keybase"
  })
  withSigner: string = "";
  @option({
    name: "pgp-private-key-path",
    description:
      "when signing with 'pgp', this is the path to the private key file"
  })
  privateKeyPath: string = "";
  @option({
    name: "pgp-private-key-passphrase",
    description:
      "when signing with 'pgp', this is the passphrase for the private key file"
  })
  privateKeyPassphrase: string = "";
  @option({
    name: "pgp-public-key-https-url",
    description:
      "when signing with 'pgp', this is the HTTPS URL to the public key that pkgsign can download to verify the package"
  })
  publicKeyUrl: string = "";
}

@command({
  description: "sign an npm/yarn package directory or tarball"
})
export default class extends Command {
  public async execute(
    @param({
      name: "pkgdir|tarball",
      description: "path to package directory or tarball",
      required: true
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
    let identityProvider: IIdentityProvider;
    if (options.withSigner == "pgp") {
      identityProvider = PgpIdentityProvider;
    } else if (options.withSigner == "keybase") {
      identityProvider = KeybaseIdentityProvider;
    } else {
      throw new Error("Not supported signer type: " + options.withSigner);
    }

    const identityProviderSigningContext: IIdentityProviderSigningContext = {
      privateKeyPath: options.privateKeyPath,
      privateKeyPassphrase: options.privateKeyPassphrase,
      publicKeyHttpsUrl: options.publicKeyUrl
    };

    if (path.endsWith(".tgz") && lstatSync(path).isFile()) {
      return await this.signTarball(
        identityProvider,
        identityProviderSigningContext,
        path
      );
    } else {
      return await this.signDirectory(
        identityProvider,
        identityProviderSigningContext,
        path
      );
    }
  }

  private async signTarball(
    identityProvider: IIdentityProvider,
    identityProviderSigningContext: IIdentityProviderSigningContext,
    tarballPath: string
  ): Promise<boolean> {
    const wd = await createWorkingDirectory();
    console.log("extracting unsigned tarball...");
    await decompress(tarballPath, wd);

    console.log("building file list...");
    const base = path.join(wd, "package");
    let files = await recursivePromise(base);
    files = files.map(fullPath => fullPath.substr(base.length + 1));

    await this.signFileList(
      identityProvider,
      identityProviderSigningContext,
      base,
      files,
      "sign-tarball"
    );

    await unlinkPromise(tarballPath);
    await compress(wd, tarballPath);

    console.log("package tarball has been signed");
    return true;
  }

  private async signDirectory(
    identityProvider: IIdentityProvider,
    identityProviderSigningContext: IIdentityProviderSigningContext,
    packagePath: string
  ): Promise<boolean> {
    console.log("building file list...");
    const files = await packlist({
      path: packagePath
    });

    await this.signFileList(
      identityProvider,
      identityProviderSigningContext,
      packagePath,
      files,
      "sign-directory"
    );

    console.log("signature.json has been created in package directory");
    return true;
  }

  private async signFileList(
    identityProvider: IIdentityProvider,
    identityProviderSigningContext: IIdentityProviderSigningContext,
    basePath: string,
    relativeFilePaths: string[],
    telemetryAction: string
  ): Promise<void> {
    const identity = await identityProvider.getIdentity(
      identityProviderSigningContext
    );

    const context = {
      dir: basePath,
      relFilesOnDisk: relativeFilePaths,
      signingIdentity: identity
    };

    let entries: Entry<any>[] = [];
    for (const entryHandler of availableEntryHandlers) {
      const entryValue = await entryHandler.generateEntry(context);
      if (entryValue !== null) {
        entries.push({
          entry: entryHandler.getEntryType(),
          value: entryValue
        });
      }
    }

    await queueTelemetryPackageAction(context, identity, telemetryAction);

    const signatureDocumentJson = await createSignedSignatureDocument(
      entries,
      identityProvider,
      identityProviderSigningContext
    );

    await writeFilePromise(
      path.join(basePath, "signature.json"),
      signatureDocumentJson
    );
  }
}
