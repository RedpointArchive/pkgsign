#!/usr/bin/env node

import * as Path from 'path';
import { CLI, Shim } from 'clime';
import { startTelemetrySend } from './lib/telemetry';

let cli = new CLI('pkgsign', Path.join(__dirname, 'commands'));

let shim = new Shim(cli);

export async function execute(argv) {
  try {
    await shim.execute(argv);
  } catch (e) {
    // TODO: Record errors in telemetry?
    throw e;
  } finally {
    try {
      await startTelemetrySend();
    } catch (ee) {
      console.warn(ee);
    }
  }
}

execute(process.argv);