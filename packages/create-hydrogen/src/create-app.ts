#!/usr/bin/env node

import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runInit} from '@shopify/cli-hydrogen/commands/hydrogen/init';

let isReactError = false;
const reactErrorRE = /(useState|Invalid hook call)/gims;

const stdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = <typeof stdoutWrite>function (item, encoding, cb) {
  if (reactErrorRE.test(item?.toString() ?? '')) {
    isReactError = true;
  } else {
    stdoutWrite(item, encoding, cb);
  }
};

const stderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = <typeof stderrWrite>function (item, encoding, cb) {
  if (reactErrorRE.test(item?.toString() ?? '')) {
    isReactError = true;
  } else {
    stderrWrite(item, encoding, cb);
  }
};

process.on('beforeExit', () => {
  if (isReactError) {
    const randomTmpDir = join(tmpdir(), Math.random().toString(36).slice(2));
    const message =
      'There is a React version mismatch. If this command failed, try the following:\n\n' +
      `npm create @shopify/hydrogen@latest --legacy-peer-deps --cache ${randomTmpDir}` +
      '\n\nLearn more in https://github.com/Shopify/hydrogen/discussions/2055';

    console.warn('\n\x1b[30m\x1b[43m WARNING \x1b[0m', message);
  }
});

runInit();
