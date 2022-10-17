import {execSync} from 'child_process';
import fs from 'fs';

const shortHash = execSync('git rev-parse --short HEAD').toString().trim();
const version = `0.0.0-next-${shortHash}`;
const packageJson = JSON.parse(fs.readFileSync('../package.json'));
packageJson.version = version;
fs.writeFileSync('../package.json', JSON.stringify(packageJson, null, 2));

try {
  execSync('npm publish --tag next');
} catch (e) {
  console.log(e);
  console.log('Publish failed');
}
