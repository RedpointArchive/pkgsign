var path = require('path');
var packlist = require('npm-packlist');
var D2UConverter = require('@dpwolfe/dos2unix').dos2unix;
var d2u = new D2UConverter({ glob: { cwd: path.join(__dirname, '..') } })
  .on('error', function(err) {
    console.error(err);
  })
  .on('end', function(stats) {
    console.log(stats);
  });
packlist({path: path.join(__dirname, '..')})
  .then((files) => {
    d2u.process(files);
  });