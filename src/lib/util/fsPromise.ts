import * as fs from "fs";
import * as recursive from "recursive-readdir";
import * as crypto from "crypto";
import * as targz from "targz";
import * as tmp from "tmp";
import { isBinaryFile } from "isbinaryfile";
import * as eolFix from "eol-fix-stream";

export function readdirPromise(dir: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

export function writeFilePromise(file: string, content: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(file, content, "utf8", err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function readFilePromise(file: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(file, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export function unlinkPromise(file: string) {
  return new Promise<void>((resolve, reject) => {
    fs.unlink(file, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function recursivePromise(path): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    recursive(path, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

export async function sha512OfFile(path): Promise<string> {
  const isBinary = await isBinaryFile(path, undefined);

  let shouldPipe = false;
  if (!isBinary) {
    // We have to convert all CRLF to LF because of how Git
    // clones text files on Windows.
    shouldPipe = true;
  }

  let fstream = fs.createReadStream(path);
  const hash = crypto.createHash("sha512");
  hash.setEncoding("hex");

  return await new Promise<string>((resolve, reject) => {
    fstream.on("end", function() {
      hash.end();
      resolve(hash.read() as string);
    });

    if (shouldPipe) {
      fstream = fstream.pipe(eolFix());
    }

    fstream.pipe(hash);
  });
}

export function createWorkingDirectory(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    tmp.dir(
      {
        unsafeCleanup: true
      },
      (err, path) => {
        if (err) {
          reject(err);
        } else {
          resolve(path);
        }
      }
    );
  });
}

export function decompress(tarball: string, out: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    targz.decompress(
      {
        src: tarball,
        dest: out
      },
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export function compress(indir: string, tarball: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    targz.compress(
      {
        src: indir,
        dest: tarball
      },
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}
