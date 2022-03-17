/* eslint-disable no-console */
import {existsSync, readFileSync} from 'fs';
import {join} from 'path';

import {configFileName, MiniOxygenPreviewOptions, preview} from './preview';

const cwd = process.cwd();
let configOptions = {};

try {
  const configFilePath = join(cwd, configFileName);
  if (existsSync(configFilePath)) {
    const data = readFileSync(configFilePath, {
      encoding: 'utf-8',
    });
    configOptions = JSON.parse(data) as unknown as MiniOxygenPreviewOptions;
  }
} catch (err) {
  console.error(`Cannot load mini-oxygen:\n${err}`);
  process.exit(1);
}

preview(configOptions);
