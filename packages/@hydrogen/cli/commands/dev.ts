import path from 'path';
import {cli} from '@remix-run/dev';
import {runBuild} from './build';
import miniOxygenPreview from '@shopify/mini-oxygen';

export async function runDev({
  entry,
  port = 3000,
}: {
  entry: string;
  port: number;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  // Initial build
  const {root, entryFile, buildPathClient, buildPathWorkerFile} =
    await runBuild({entry, minify: false, sourcemap: false});

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
