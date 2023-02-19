import * as fs from 'fs';
import * as url from 'url';
import * as path from 'path';

import {plopDir} from 'plop-dir';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const UPGRADE_DIRECTORY = path.join(__dirname, './packages/cli/src/upgrades/');
const SETUPS_DIRECTORY = path.join(__dirname, './packages/cli/src/setups/');

/** @param {import('plop').NodePlopAPI} plop */
export default async function run(plop) {
  plop.setGenerator(
    'upgrade',
    await plopDir({
      plop,
      templateDir: path.join(__dirname, './generators/guide'),
      outputDir: UPGRADE_DIRECTORY,
      prompts: [
        {
          name: 'name',
          message: 'Version the guide is for',
          suffix: ' (e.g. 2023.1.1)',
          validate: validateVersion,
        },
      ],
    }),
  );
  plop.setGenerator(
    'setup',
    await plopDir({
      plop,
      templateDir: path.join(__dirname, './generators/guide'),
      outputDir: SETUPS_DIRECTORY,
      prompts: [
        {
          name: 'name',
          message: 'Component the guide is for',
          suffix: ' (e.g. seo)',
          validate: validateSetup,
        },
      ],
    }),
  );
}

function validateVersion(version) {
  const regex = /^v\d{4}\.\d\.\d$/;

  if (!regex.test(version)) {
    return 'Version must be a valid calver version in the format vYEAR.MONTH.PATCH (e.g. v2023.1.1)';
  }

  return (
    !fs.existsSync(path.join(UPGRADE_DIRECTORY, `${version}`)) ||
    `An upgrade for ${version} already exists`
  );
}

function validateSetup(name) {
  return (
    !fs.existsSync(path.join(SETUPS_DIRECTORY, `${name}`)) ||
    `An setup for ${name} already exists`
  );
}

