import path from 'path';
import * as remix from '@remix-run/dev/dist/compiler.js';
import miniOxygen from '@shopify/mini-oxygen';
import {runBuild} from './build.js';
import {getProjectPaths, getRemixConfig} from '../../utils/config.js';
import {muteDevLogs} from '../../utils/log.js';
import {flags} from '../../utils/flags.js';
import fs from 'fs-extra';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';

import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {isWebContainer} from '../../utils/platform.js';

const miniOxygenPreview =
  miniOxygen.default ?? (miniOxygen as unknown as typeof miniOxygen.default);

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
    node: Flags.boolean({
      env: 'SHOPIFY_HYDROGEN_FLAG_NODE',
      description:
        'Serve the storefront using a Node.js server instead of MiniOxygen',
      default: isWebContainer(),
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
  node = false,
}: {
  entry: string;
  port?: number;
  path?: string;
  node?: boolean;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  // Initial build
  await runBuild({entry, path: appPath, minify: false, node});

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
    const require = createRequire(import.meta.url);
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

  const devReloadPath = path.resolve(
    fileURLToPath(import.meta.url),
    '..',
    '..',
    '..',
    '..',
    'bin',
    'dev-reload.mjs',
  );

  const buildCommand = `${devReloadPath} ${entry}`;

  if (node) {
    const {setupNodeServer} = await import('../../utils/node-server.js');

    return setupNodeServer({
      buildPathWorkerFile,
      buildPathClient,
      buildWatchPaths,
      port,
      buildCommand: buildCommand + ' --node',
      env: process.env,
    });
  }

  // Run MiniOxygen and watch worker build
  miniOxygenPreview({
    workerFile: buildPathWorkerFile,
    port,
    assetsDir: buildPathClient,
    publicPath: '',
    buildCommand,
    watch: true,
    buildWatchPaths,
    autoReload: true,
    modules: true,
    env: process.env,
  });
}
