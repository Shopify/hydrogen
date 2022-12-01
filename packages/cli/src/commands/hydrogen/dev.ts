import path from 'path';
import * as remix from '@remix-run/dev/dist/compiler.js';
import {copyPublicFiles} from './build.js';
import {getProjectPaths, getRemixConfig} from '../../utils/config.js';
import {muteDevLogs} from '../../utils/log.js';
import {flags} from '../../utils/flags.js';

import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {startMiniOxygen} from '../../utils/mini-oxygen.js';

const LOG_INITIAL_BUILD = '\n🏁 Initial build';
const LOG_REBUILDING = '🧱 Rebuilding...';
const LOG_REBUILT = '🚀 Rebuilt';

// @ts-ignore
export default class Dev extends Command {
  static description =
    'Runs Hydrogen storefront in a MiniOxygen worker in development';
  static flags = {
    ...flags,
    port: Flags.integer({
      description: 'Port to run the preview server on',
      env: 'SHOPIFY_HYDROGEN_FLAG_PORT',
      default: 3000,
    }),
    entry: Flags.string({
      env: 'SHOPIFY_HYDROGEN_FLAG_ENTRY',
      default: 'oxygen.ts',
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Dev);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runDev({...flags, path: directory});
  }
}

export async function runDev({
  entry,
  port,
  path: appPath,
}: {
  entry: string;
  port?: number;
  path?: string;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  const {root, entryFile, buildPathWorkerFile, buildPathClient, publicPath} =
    getProjectPaths(appPath, entry);

  const remixConfig = await getRemixConfig(root, entryFile);

  muteDevLogs();

  console.time(LOG_INITIAL_BUILD);
  const copyingFiles = copyPublicFiles(publicPath, buildPathClient);

  remix.watch(remixConfig, {
    mode: process.env.NODE_ENV as any,
    onFileCreated(file: string) {
      // eslint-disable-next-line no-console
      console.log(`\n📄 File created: ${path.relative(root, file)}`);
    },
    onFileChanged(file: string) {
      // eslint-disable-next-line no-console
      console.log(`\n📄 File changed: ${path.relative(root, file)}`);
    },
    onFileDeleted(file: string) {
      // eslint-disable-next-line no-console
      console.log(`\n📄 File deleted: ${path.relative(root, file)}`);
    },
    async onInitialBuild() {
      await copyingFiles;
      console.timeEnd(LOG_INITIAL_BUILD);

      startMiniOxygen({
        root,
        port,
        watch: true,
        buildPathWorkerFile,
        buildPathClient,
      });
    },
    onRebuildStart() {
      // eslint-disable-next-line no-console
      console.log(LOG_REBUILDING);
      console.time(LOG_REBUILT);
    },
    async onRebuildFinish() {
      console.timeEnd(LOG_REBUILT);
    },
  });
}
