import path from 'path';
import * as remix from '@remix-run/dev/dist/compiler.js';
import {runBuild} from './build.js';
import {getProjectPaths, getRemixConfig} from '../../utils/config.js';
import {muteDevLogs} from '../../utils/log.js';
import {flags} from '../../utils/flags.js';
import fs from 'fs-extra';
import {createRequire} from 'module';
import chokidar from 'chokidar';

import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {startMiniOxygen} from '../../utils/mini-oxygen.js';

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

  const {root, entryFile, buildPathWorkerFile, buildPathClient} =
    getProjectPaths(appPath, entry);

  const remixConfig = await getRemixConfig(root);

  muteDevLogs();

  const extraFilesToWatch = [entryFile];

  if (process.env.LOCAL_DEV) {
    // Watch local packages when developing in Hydrogen repo
    const require = createRequire(import.meta.url);
    const packagesPath = path.resolve(
      path.dirname(require.resolve('@shopify/hydrogen')),
      '..',
      '..',
    );

    const packages = (await fs.readdir(packagesPath)).map((pkg) =>
      path.resolve(packagesPath, pkg, 'dist'),
    );

    extraFilesToWatch.push(...packages);
  }

  const buildWoker = () =>
    runBuild({entry, path: appPath, minify: false, workerOnly: true});

  console.time('\n🏁 Initial build');

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
      await buildWoker();
      console.timeEnd('\n🏁 Initial build');

      startMiniOxygen({
        root,
        port,
        watch: true,
        buildPathWorkerFile,
        buildPathClient,
      });

      chokidar
        .watch(extraFilesToWatch, {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 100,
          },
        })
        .on('change', async (file) => {
          console.log(`\n📄 File changed: ${path.relative(root, file)}`);
          console.log(LOG_REBUILDING);
          console.time(LOG_REBUILT);
          await buildWoker();
          console.timeEnd(LOG_REBUILT);
        });
    },
    onRebuildStart() {
      // eslint-disable-next-line no-console
      console.log(LOG_REBUILDING);
      console.time(LOG_REBUILT);
    },
    async onRebuildFinish() {
      await buildWoker();
      console.timeEnd(LOG_REBUILT);
    },
  });
}
