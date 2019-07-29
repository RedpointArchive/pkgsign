var path = require('path');
var json = require(path.join(__dirname, '..', 'package.json'));
process.exitCode = json.version.indexOf('-') === -1 ? 1 : 0;