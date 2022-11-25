#!/usr/bin/env -S node

/*
  This file is equivalent to `shopify hydrogen build --devReload --entry xyz`.
  For some unknown reason, the CLI cannot recognize any Hydrogen command
  (err: `hydrogen:build not found`) when called from MiniOxygen's `buildCommand`.
  Therefore, we execute this file instead from MiniOxygen.
*/

import {runBuild} from '../dist/commands/hydrogen/build.js';

await runBuild({
  devReload: true,
  entry: process.argv[2],
  node: process.argv.some((arg) => arg === '--node'),
});
