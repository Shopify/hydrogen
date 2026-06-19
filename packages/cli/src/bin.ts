#!/usr/bin/env node
import {Config, flush, run} from '@oclif/core';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMMANDS} from './index.js';

const hydrogenCommandPrefix = 'hydrogen';
const commandIds = new Set(Object.keys(COMMANDS));

function normalizeArgv(argv: string[]) {
  for (let endIndex = argv.length; endIndex > 0; endIndex -= 1) {
    const commandId = [hydrogenCommandPrefix, ...argv.slice(0, endIndex)].join(
      ':',
    );

    if (commandIds.has(commandId)) {
      return [commandId, ...argv.slice(endIndex)];
    }
  }

  return argv;
}

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = normalizeArgv(process.argv.slice(2));
const config = new Config({root: pluginRoot});

await config.load();
await run(argv, config);
await flush();
