import * as path from 'path';
import * as fs from 'fs';
export const description = `pkgsign ${JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')).version} - sign and verify packages`;