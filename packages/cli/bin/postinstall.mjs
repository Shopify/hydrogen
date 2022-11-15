#!/usr/bin/env node

/**
 * This script executed after the installation of dependencies ensures that the CLI's package.json
 * at node_modules/@shopify/cli lists the plugins in this repository. Otherwise they are not loaded
 * automatically by oclif.
 */
import {dirname, join as pathJoin} from 'pathe';
import {fileURLToPath} from 'node:url';
import {promises} from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPackageJsonPath = pathJoin(
  __dirname,
  '../../../node_modules/@shopify/cli/package.json',
);
let cliPackageJson = JSON.parse(await promises.readFile(cliPackageJsonPath));

const pluginName = 'h2';

cliPackageJson.oclif.plugins = [
  ...cliPackageJson.oclif.plugins,
  `@shopify/plugin-${pluginName}`,
  '@oclif/plugin-plugins',
];

await promises.writeFile(
  cliPackageJsonPath,
  JSON.stringify(cliPackageJson, null, 2),
);
