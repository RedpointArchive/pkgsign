type ReadableStream<T = any> = any;

declare module "eol-fix-stream" {
  import stream = require("stream");
  const transform: () => stream.Transform;
  export = transform;
}

declare module "node-cmd";

declare module "silent-spawn";
