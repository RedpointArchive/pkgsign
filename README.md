# pkgsign

_A CLI tool for signing and verifying npm and yarn packages._

[![pkgsign status](https://us-central1-pkgsign.cloudfunctions.net/pkgsign-badge?name=pkgsign&expectedIdentity=%40hachque)](https://github.com/RedpointGames/pkgsign#github-badges)

pkgsign is a tool for adding signatures to npm and yarn packages, as well as verifying those packages using known signatures. It allows for signing packages with PGP private keys or [keybase.io](https://keybase.io/) for simplicity.

## Why pkgsign?

Recently [several packages went missing from the npm registry](https://status.npmjs.org/incidents/41zfb8qpvrdj), which caused significant issues for users dependent on those packages. More concerning however was that for a 3 hour time period, completely untrusted users were able to upload new packages over the old package names. In at least one case, the uploaded package was replaced with a modified version.

Any automated builds that occurred in that time period which automatically installed npm packages, or upgraded minor versions, would be running code uploaded by an individual they did not originally trust.

pkgsign solves this issue with package signing. Once an identity is trusted to sign a package, only that identity can verify existing or new packages under the same name.

pkgsign doesn't require any modifications to the npm registry or any existing package managers in order to work.

## Disclaimer

pkgsign currently depends on unsigned packages (because it is new!). When you install pkgsign from either GitHub or npm, those dependencies can't yet be verified.

We're planning on introducing a 'sign on behalf of' feature, so that packages can sign the content of their dependencies. This will enable packages to be fully signed and verified, even while the original authors of those dependencies have not signed the content. However, this means that dependencies have to be exactly fixed to a version and can't automatically take minor or patch updates, as any change to the dependency's files will invalidate the signature.

## Installation

### From Source

Because `npm` nor `yarn` support package verification yet, this is the only way to be certain you're getting a version of `pkgsign` that is intact. Therefore we recommend you clone, build and install `pkgsign` from GitHub.

```
git clone https://github.com/RedpointGames/pkgsign .
yarn                                  # install dependencies
yarn verify                           # build pkgsign and verify the signature.json provided in this repository
                                      # (should be signed by hachque at keybase.io)
yarn pack --filename=pkgsign.tgz      # make an unsigned package for local use
npm install -g ./pkgsign.tgz          # install pkgsign globally
```

### Using npm / yarn

You can install `pkgsign` from npm for simplicity, but keep in mind neither `npm` nor `yarn` support package verification, so you have no way of knowing for certain that npm is serving you an unmodified version of `pkgsign`. You can't trust `pkgsign` to verify itself after installing from npm, as it may have been tampered with to prevent any detectable failures. We **strongly recommend** you install it from GitHub instead.

Never the less, if you want to take that risk, you can install `pkgsign` from the npm registry with:

```
yarn global add pkgsign
```

## Usage

Once you've installed pkgsign, it will be available as the `pkgsign` command-line tool globally.

### Verifying packages

To verify the signing status of the current package directory, and all package dependencies that are installed, you can use:

```
pkgsign verify . --full
```

If you want to verify the signature of a package tarball, you can use:

```
pkgsign verify mypackage-v1.0.0.tgz --package-name mypackage
```

### Signing packages

You can sign packages using either [keybase.io](https://keybase.io/) or a PGP keypair, where the public key is available at a public HTTPS URL.

If you have keybase installed and in your PATH, you can sign the current package directory with:

```
pkgsign sign .
```

Alternatively, if you want to use keybase to sign a tarball, you can sign one with:

```
pkgsign sign mypackage-v1.0.0.tgz
```

If you want to sign a package with a PGP keypair, you can use:

```
pkgsign sign --signer pgp --pgp-private-key-path ./privkey.key --pgp-private-key-passphrase mypassphrase --pgp-public-key-https-url https://example.com/mykey.asc .
```

To sign a tarball with a PGP keypair, pass the tarball path instead of a package directory.

It should be noted the public key HTTPS URL is used as the identity - if the URL ever changes, it's the same thing as someone else signing your package, and pkgsign will consider the package with a different URL as compromised.

#### package.json specialties

When installing a package with npm, metadata fields are added to the resulting `package.json` in the `node_modules` folder:  
```json
{
  "_from": "file:/what-ever/pkgsign/test/original/regular-pkg/regular-pkg.tgz",
  "_id": "regular-pkg@1.2.3",
  "_inBundle": false,
  "_integrity": "sha512-EQpOa7Hs0uGkvzn5St1uNyqCDNWKK9yLqDINq5PhcVQD5SbP2fBBFZfdjM62elC43OZVEzU+HKnk5NiepkfTJQ==",
  "_location": "/regular-pkg",
  ...
}
```

Even when publishing a package with npm fields can be added (E.g. `gitHead`).  
Other fields are modified during installation:  

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/user/pkg"
  }
}
```

becomes:  
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/user/pkg.git"
  }
}
```

Also properties in `node_modules/*/package.json` are ordered alphabetically.  
All of this modifications can fail the verification check.  
Therefore `pkgsign` produces a npm-compatible signature entry and verify only this entry if npm is either used to publish or install a package.  
This will result in a command line message like:  

    WARNING: package '<packageName>' is either published and/or installed with npm - performing npm compatible package.json verification

## GitHub Badges

If you want to display the signing status of your project on GitHub, you can use the following Markdown:

```
[![pkgsign status](https://us-central1-pkgsign.cloudfunctions.net/pkgsign-badge?name={name}&expectedIdentity={identity})](https://github.com/RedpointGames/pkgsign)
```

Replace `{name}` with the URL encoded package name on NPM, and `{identity}` with the URL encoded form of either `@name` for keybase.io identities, or the URL encoded form of the HTTPS URL for PGP identities.

## Contributing

Contributions are welcome - feel free to send a PR or file issues.

## License

```
Copyright 2018 Redpoint Games Pty Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
