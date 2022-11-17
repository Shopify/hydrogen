import path from 'path';
import * as remix from '@remix-run/dev/dist/compiler';
import miniOxygenPreview from '@shopify/mini-oxygen';
import {runBuild} from './build';
import {getProjectPaths, getRemixConfig} from '../utils/config';
import {muteDevLogs} from '../utils/log';
import fs from 'fs-extra';

export async function runDev({
  entry,
  port = 3000,
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
    onFileCreated(file) {
      // eslint-disable-next-line no-console
      console.log(`File created: ${path.relative(root, file)}`);
    },
    onFileChanged(file) {
      // eslint-disable-next-line no-console
      console.log(`File changed: ${path.relative(root, file)}`);
    },
    onFileDeleted(file) {
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
  miniOxygenPreview({
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
