import path from 'path';
import * as remix from '@remix-run/dev/dist/compiler';
import miniOxygenPreview from '@shopify/mini-oxygen';
import {runBuild} from './build';
import {getProjectPaths, getRemixConfig} from '../../utils/config';
import {muteDevLogs} from '../../utils/log';
import {flags} from '../../utils/flags';
import fs from 'fs-extra';

// import {createRequire} from 'node:module';
// TODO: why can't we use the shopify kit version of this?
// import Command from '@shopify/cli-kit/node/base-command';
import {Flags, Command} from '@oclif/core';

// const require = createRequire(import.meta.url);
// const remix = require('@remix-run/dev/dist/compiler');
// const miniOxygenPreview = require('@shopify/mini-oxygen');

export default class Dev extends Command {
  static description = 'Builds a Hydrogen storefront for production';
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

  // Initial build
  await runBuild({entry, path: appPath, minify: false});

  const {root, entryFile, buildPathWorkerFile, buildPathClient} =
    getProjectPaths(appPath, entry);

  const remixConfig = await getRemixConfig(root);

  muteDevLogs();

  // Watch server build
  remix.watch(remixConfig, {
    mode: process.env.NODE_ENV as any,
    onRebuildStart() {
      // eslint-disable-next-line no-console
      console.log('Rebuilding...');
    },
    onFileCreated(file: string) {
      // eslint-disable-next-line no-console
      console.log(`File created: ${path.relative(root, file)}`);
    },
    onFileChanged(file: string) {
      // eslint-disable-next-line no-console
      console.log(`File changed: ${path.relative(root, file)}`);
    },
    onFileDeleted(file: string) {
      // eslint-disable-next-line no-console
      console.log(`File deleted: ${path.relative(root, file)}`);
    },
  });

  const buildWatchPaths = [
    entryFile,
    path.resolve(root, remixConfig.serverBuildPath),
  ];

  if (process.env.LOCAL_DEV) {
    // Watch local packages when developing in Hydrogen repo
    const packagesPath = path.resolve(
      path.dirname(require.resolve('@shopify/hydrogen')),
      '..',
      '..',
    );

    const packages = (await fs.readdir(packagesPath)).map((pkg) =>
      path.resolve(packagesPath, pkg, 'dist'),
    );

    buildWatchPaths.push(...packages);
  }

  // Run MiniOxygen and watch worker build
  miniOxygenPreview.default({
    workerFile: buildPathWorkerFile,
    port,
    assetsDir: buildPathClient,
    publicPath: '',
    buildCommand: `cd ${root} && npm run h2 build -- --dev-reload --entry ${entry}`,
    watch: true,
    buildWatchPaths,
    autoReload: true,
    modules: true,
    env: process.env,
  });
}
