import path from 'path';
import {cli} from '@remix-run/dev';
import miniOxygenPreview from '@shopify/mini-oxygen';
import {runBuild} from './build';
import {getProjectPaths} from '../utils/paths';

export async function runDev({
  entry,
  port = 3000,
}: {
  entry: string;
  port: number;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  // Initial build
  await runBuild({entry, minify: false, sourcemap: false});

  const {root, entryFile, buildPathWorkerFile, buildPathClient} =
    getProjectPaths(entry);

  //@ts-ignore
  const remixConfig = await import(path.resolve(root, 'remix.config.js'));

  // Watch server build
  cli.run(['watch', root]);

  // Run MiniOxygen and watch worker build
  miniOxygenPreview({
    workerFile: buildPathWorkerFile,
    port,
    assetsDir: buildPathClient,
    publicPath: '',
    buildCommand: `cd ${root} && npm run h2 build -- --dev-reload --entry ${entry}`,
    watch: true,
    buildWatchPaths: [
      entryFile,
      path.resolve(root, remixConfig.serverBuildPath),
    ],
    autoReload: true,
    modules: true,
    env: process.env,
  });
}
