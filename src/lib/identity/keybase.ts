import * as cmd from "node-cmd";
import {
  IIdentityProvider,
  IIdentityProviderSigningContext,
  IIdentityProviderVerificationContext
} from ".";
import { SignatureIdentity } from "../types";
import stripAnsi from "strip-ansi";
import {
  createWorkingDirectory,
  writeFilePromise,
  unlinkPromise
} from "../util/fsPromise";
import { join } from "path";
import * as openpgp from "openpgp";
import fetch from "node-fetch";

export const KeybaseIdentityProvider: IIdentityProvider = {
  getIdentity: async (
    context: IIdentityProviderSigningContext
  ): Promise<SignatureIdentity> => {
    const keybaseIdentity = await new Promise<string>((resolve, reject) => {
      cmd.get("keybase id", (err, data, stderr) => {
        if (err) {
          reject(err);
        } else {
          const result = /Identifying (.+)/g.exec(data + stderr);
          if (result[1] === undefined) {
            reject(
              new Error("keybase didn't return your username for 'keybase id'")
            );
          } else {
            resolve(result[1]);
          }
        }
      });
    });
    let stripAnsiFn = await stripAnsi;
    return {
      keybaseUser: stripAnsiFn(keybaseIdentity)
    };
  },

  signEntries: async (
    context: IIdentityProviderSigningContext,
    deterministicString: string
  ): Promise<string> => {
    console.log("requesting keybase pgp sign deterministic signature...");
    console.log("(you may receive an interactive prompt from keybase)");
    const wd = await createWorkingDirectory();
    const fileToSignPath = join(wd, "signature.sig");
    await writeFilePromise(fileToSignPath, deterministicString);
    const keybaseSignature = await new Promise<string>((resolve, reject) => {
      cmd.get(
        'keybase pgp sign --detached -i "' + fileToSignPath + '"',
        (err, data, stderr) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        }
      );
    });
    await unlinkPromise(fileToSignPath);
    return keybaseSignature;
  },

  verify: async (
    context: IIdentityProviderVerificationContext,
    identity: SignatureIdentity,
    signature: string,
    deterministicString: string
  ): Promise<boolean> => {
    let didFetch = false;
    const fetchPub = async () => {
      console.log(
        "fetching public keys of user " + identity.keybaseUser + "..."
      );
      didFetch = true;
      return await (await fetch(
        "https://keybase.io/" + identity.keybaseUser + "/pgp_keys.asc"
      )).text();
    };

    const attemptVerify = async (rawPublicKeys: string) => {
      try {
        const publicKeys = (await openpgp.key.readArmored(rawPublicKeys)).keys;
        const verifyOptions = {
          message: openpgp.message.fromText(deterministicString),
          signature: openpgp.signature.readArmored(signature),
          publicKeys: publicKeys
        };
        const verifiedMessage = await openpgp.verify(verifyOptions);
        return verifiedMessage.signatures.length >= 1;
      } catch (e) {
        return false;
      }
    };

    let rawPublicKeys = await context.trustStore.getOrFetchCachedPublicKeys(
      "keybase.io." + identity.keybaseUser,
      fetchPub
    );
    let firstTry = await attemptVerify(rawPublicKeys);
    if (didFetch || firstTry) {
      return firstTry;
    } else {
      // user might have updated their PGP public keys with a new signature, refetch.
      rawPublicKeys = await context.trustStore.fetchCachedPublicKeys(
        "keybase.io." + identity.keybaseUser,
        fetchPub
      );
      return await attemptVerify(rawPublicKeys);
    }
  }
};
