#!/usr/bin/env node --no-warnings
/* eslint-disable no-new-func */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/catch-or-return */
/* eslint-disable no-console */
import {writeFileSync, existsSync} from 'fs';
import {resolve} from 'path';

import {MiniOxygenPreviewOptions, configFileName} from './preview';

const DEFAULTS: Required<
  Omit<
    MiniOxygenPreviewOptions,
    'log' | 'envPath' | 'onRequest' | 'onResponse' | 'onResponseError'
  >
> = {
  port: 3000,
  workerFile: 'dist/worker/index.js',
  assetsDir: 'dist/client',
  publicPath: '',
  buildCommand: 'yarn build',
  watch: true,
  buildWatchPaths: ['./src'],
  autoReload: true,
  modules: true,
  sourceMap: true,
  env: {},
};

// Credit for this hack goes to:
// https://github.com/microsoft/TypeScript/issues/43329#issuecomment-1008361973
// The reason for this is to load an ESM-only module via TS while transpiling to commonjs
(
  Function('return import("inquirer")')() as Promise<typeof import('inquirer')>
).then((inquirer) => {
  inquirer.default
    .prompt([
      {
        name: 'port',
        type: 'number',
        message: 'TCP port to use for development server',
        default: DEFAULTS.port,
      },
      {
        name: 'workerFile',
        message: 'Relative path to the worker file',
        default: DEFAULTS.workerFile,
        validate: (input) => {
          return existsSync(resolve(input))
            ? true
            : `No file found at ${resolve(
                input,
              )}. You may need to build your project first.`;
        },
      },
      {
        name: 'assetsDir',
        message:
          'Relative path to the where public assets are located for your project',
        default: DEFAULTS.assetsDir,
        validate: (input: string) => {
          return existsSync(resolve(input))
            ? true
            : `No directory found at ${resolve(
                input,
              )}. You may need to build your project first.`;
        },
      },
      {
        name: 'publicPath',
        message: 'URL or pathname that prefixes the public assets file names',
        default: DEFAULTS.publicPath,
      },
      {
        name: 'envPath',
        message: 'Path to the .env file to be loaded automatically',
        filter(input) {
          if (input === '') {
            return undefined;
          }
          return input;
        },
        validate: (input) => {
          if (input === '' || input === undefined) {
            return true;
          }

          return existsSync(resolve(input))
            ? true
            : `No file found at ${resolve(input)}`;
        },
      },
      {
        name: 'buildCommand',
        message: 'Command to run that will trigger the build for your project',
        default: DEFAULTS.buildCommand,
      },
      {
        name: 'watch',
        type: 'confirm',
        message: 'Watch for source file changes?',
        default: DEFAULTS.watch,
      },
      {
        name: 'buildWatchPaths',
        message:
          'Any paths that should trigger the build command when changed. Separate multiple with a ,',
        default: DEFAULTS.buildWatchPaths,
        when: (answers: {[key: string]: any}) => answers.watch === true,
        filter: (input: string) => {
          if (Array.isArray(input)) return input;

          // Need to change input string into an array of file paths
          return input.split(',').map((filePath: string) => filePath.trim());
        },
      },
      {
        name: 'autoReload',
        type: 'confirm',
        message: 'Auto refresh browser after changes?',
        default: DEFAULTS.autoReload,
        when: (answers: {[key: string]: any}) => answers.watch === true,
      },
      {
        name: 'modules',
        type: 'confirm',
        message: 'Does your worker file use ES module syntax?',
        default: DEFAULTS.modules,
      },
    ])
    .then((answers) => {
      const filePathFull = resolve(configFileName);
      writeFileSync(
        configFileName,
        JSON.stringify({...answers, env: DEFAULTS.env}, null, 2),
        'utf-8',
      );
      console.log(
        `✅ Successfully generated config file at ${filePathFull}\n🔑 You may add environment variables for your worker by editing this file`,
      );
    })
    .catch((error) => {
      if (error.isTtyError) {
        console.log(
          `Cannot launch config file assistant in current environment. Please manually add a ${configFileName} file in the root of your project in the following format\n${JSON.stringify(
            DEFAULTS,
            null,
            2,
          )}`,
        );
      } else {
        console.log(
          `Failed to complete config file assistant. Please re-run the command or manually add a ${configFileName} file in the root of your project in the following format\n${JSON.stringify(
            DEFAULTS,
            null,
            2,
          )}`,
        );
      }
    });
});
