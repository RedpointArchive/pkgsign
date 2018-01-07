"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const recursive = require("recursive-readdir");
const crypto = require("crypto");
const targz = require("targz");
const tmp = require("tmp");
function readdirPromise(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(files);
            }
        });
    });
}
exports.readdirPromise = readdirPromise;
function writeFilePromise(file, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, content, 'utf8', (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.writeFilePromise = writeFilePromise;
function readFilePromise(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}
exports.readFilePromise = readFilePromise;
function unlinkPromise(file) {
    return new Promise((resolve, reject) => {
        fs.unlink(file, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.unlinkPromise = unlinkPromise;
function recursivePromise(path) {
    return new Promise((resolve, reject) => {
        recursive(path, (err, files) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(files);
            }
        });
    });
}
exports.recursivePromise = recursivePromise;
function sha512OfFile(path) {
    return new Promise((resolve, reject) => {
        const fstream = fs.createReadStream(path);
        const hash = crypto.createHash('sha512');
        hash.setEncoding('hex');
        fstream.on('end', function () {
            hash.end();
            resolve(hash.read());
        });
        fstream.pipe(hash);
    });
}
exports.sha512OfFile = sha512OfFile;
function createWorkingDirectory() {
    return new Promise((resolve, reject) => {
        tmp.dir({
            unsafeCleanup: true,
        }, (err, path) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(path);
            }
        });
    });
}
exports.createWorkingDirectory = createWorkingDirectory;
function decompress(tarball, out) {
    return new Promise((resolve, reject) => {
        targz.decompress({
            src: tarball,
            dest: out,
        }, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.decompress = decompress;
function compress(indir, tarball) {
    return new Promise((resolve, reject) => {
        targz.compress({
            src: indir,
            dest: tarball,
        }, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.compress = compress;
//# sourceMappingURL=fsPromise.js.map