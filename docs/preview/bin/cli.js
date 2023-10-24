const {spawnSync} = require('child_process');
const path = require('path');

const docsMetaFile = path.resolve(process.cwd(), process.argv[2]);
process.env.DOCS_META_FILE = docsMetaFile;

console.log('Watching: ' + docsMetaFile);

spawnSync('npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});
