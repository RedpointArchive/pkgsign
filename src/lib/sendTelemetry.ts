import * as process from 'process';
import * as path from 'path';
import { readFileSync, unlinkSync } from 'fs';
import { sendTelemetry } from './telemetry';
import { writeFileSync } from 'fs';

const telemetry = JSON.parse(readFileSync(process.argv[2], 'utf8'));

sendTelemetry(telemetry)
  .then(() => {
    unlinkSync(process.argv[2]);
    process.exit(0);
  })
  .catch((err) => {
    unlinkSync(process.argv[2]);
    process.exit(1);
  });