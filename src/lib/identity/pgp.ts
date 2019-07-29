import {
  IIdentityProvider,
  IIdentityProviderSigningContext,
  IIdentityProviderVerificationContext
} from ".";
import { SignatureIdentity } from "../types";
import { readFilePromise } from "../util/fsPromise";
import * as openpgp from "openpgp";
import fetch from "node-fetch";
import * as crypto from "crypto";

export const PgpIdentityProvider: IIdentityProvider = {
  getIdentity: async (
    context: IIdentityProviderSigningContext
  ): Promise<SignatureIdentity> => {
    return {
      pgpPublicKeyUrl: context.publicKeyHttpsUrl
    };
  },

  signEntries: async (
    context: IIdentityProviderSigningContext,
    deterministicString: string
  ): Promise<string> => {
    console.log("signing with private pgp key...");
    const privateKeyFileContents = await readFilePromise(
      context.privateKeyPath
    );
    const privateKey = await openpgp.key.readArmored(privateKeyFileContents);
    const privateKeyObject = privateKey.keys[0];
    if (context.privateKeyPassphrase !== undefined) {
      await privateKeyObject.decrypt(context.privateKeyPassphrase);
    }
    const text = new openpgp.cleartext.CleartextMessage(
      deterministicString,
      null as any /* function typedef is wrong here */
    );
    const options = {
      message: text,
      privateKeys: privateKeyObject,
      detached: true
    };
    const signedResult = await openpgp.sign(options);
    return signedResult.signature.replace(/\r\n/g, "\n");
  },

  verify: async (
    context: IIdentityProviderVerificationContext,
    identity: SignatureIdentity,
    signature: string,
    deterministicString: string
  ): Promise<boolean> => {
    if (identity.pgpPublicKeyUrl === undefined) {
      return false;
    }

    const pgpPublicKeyUrl = identity.pgpPublicKeyUrl;

    if (!pgpPublicKeyUrl.startsWith("https://")) {
      // public key URLs must be HTTPS.
      return false;
    }

    let didFetch = false;
    const fetchPub = async () => {
      console.log("fetching public keys at URL " + pgpPublicKeyUrl + "...");
      didFetch = true;
      return await (await fetch(pgpPublicKeyUrl)).text();
    };

    const attemptVerify = async (rawPublicKeys: string) => {
      try {
        const publicKeys = (await openpgp.key.readArmored(rawPublicKeys)).keys;
        const verifyOptions = {
          message: openpgp.message.fromText(deterministicString),
          signature: await openpgp.signature.readArmored(signature),
          publicKeys: publicKeys
        };
        const verifiedMessage = await openpgp.verify(verifyOptions);
        return verifiedMessage.signatures.length >= 1;
      } catch (e) {
        return false;
      }
    };

    let urlHashObj = crypto.createHash("sha512");
    urlHashObj.update(pgpPublicKeyUrl);
    let urlHash = urlHashObj.digest("hex");

    let rawPublicKeys = await context.trustStore.getOrFetchCachedPublicKeys(
      "pgp.https." + urlHash,
      fetchPub
    );
    let firstTry = await attemptVerify(rawPublicKeys);
    if (didFetch || firstTry) {
      return firstTry;
    } else {
      // user might have updated their PGP public keys with a new signature, refetch.
      rawPublicKeys = await context.trustStore.fetchCachedPublicKeys(
        "pgp.https." + urlHash,
        fetchPub
      );
      return await attemptVerify(rawPublicKeys);
    }
  }
};
