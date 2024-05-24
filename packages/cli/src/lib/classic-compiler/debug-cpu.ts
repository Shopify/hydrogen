import {outputWarn} from '@shopify/cli-kit/node/output';
import {createRemixLogger} from '../log.js';
import {importLocal} from '../import-utils.js';
import {
  getRemixConfig,
  handleRemixImportFail,
  type RemixConfig,
  type ServerMode,
} from '../remix-config.js';

type DebugOptions = {
  directory: string;
  output: string;
  buildPathWorkerFile: string;
  hooks: {
    onServerBuildStart: () => void | Promise<void>;
    onServerBuildFinish: () => void | Promise<void>;
  };
};

export async function runClassicCompilerDebugCpu({
  directory,
  hooks,
}: DebugOptions) {
  type RemixWatch = typeof import('@remix-run/dev/dist/compiler/watch.js');
  type RemixFileWatchCache =
    typeof import('@remix-run/dev/dist/compiler/fileWatchCache.js');

  const [{watch}, {createFileWatchCache}] = await Promise.all([
    importLocal<RemixWatch>('@remix-run/dev/dist/compiler/watch.js', directory),
    importLocal<RemixFileWatchCache>(
      '@remix-run/dev/dist/compiler/fileWatchCache.js',
      directory,
    ),
  ]).catch(handleRemixImportFail);

  const fileWatchCache = createFileWatchCache();

  const closeWatcher = await watch(
    {
      config: (await getRemixConfig(directory)) as RemixConfig,
      options: {
        mode: process.env.NODE_ENV as ServerMode,
        sourcemap: true,
      },
      fileWatchCache,
      logger: createRemixLogger(),
    },
    {
      onBuildStart: hooks.onServerBuildStart,
      async onBuildFinish(context, duration, succeeded) {
        if (succeeded) {
          await hooks.onServerBuildFinish();
        } else {
          outputWarn('\nBuild failed, waiting for changes to restart...');
        }
      },
      async onFileChanged(file) {
        fileWatchCache.invalidateFile(file);
      },
      async onFileDeleted(file) {
        fileWatchCache.invalidateFile(file);
      },
    },
  );

  return {
    async close() {
      await closeWatcher();
    },
  };
}
