#!/usr/bin/env node
// oclif dev entry point for local hydrogen CLI development
import {execute} from '@oclif/core';
await execute({type: 'plugin', dir: import.meta.url});
