import { outputWarn } from '@shopify/cli-kit/node/output';
import { createRemixLogger } from '../log.js';
import { importLocal } from '../import-utils.js';
import { handleRemixImportFail, getRemixConfig } from '../remix-config.js';

async function runClassicCompilerDebugCpu({
  directory,
  hooks
}) {
  const [{ watch }, { createFileWatchCache }] = await Promise.all([
    importLocal("@remix-run/dev/dist/compiler/watch.js", directory),
    importLocal(
      "@remix-run/dev/dist/compiler/fileWatchCache.js",
      directory
    )
  ]).catch(handleRemixImportFail);
  const fileWatchCache = createFileWatchCache();
  const closeWatcher = await watch(
    {
      config: await getRemixConfig(directory),
      options: {
        mode: process.env.NODE_ENV,
        sourcemap: true
      },
      fileWatchCache,
      logger: createRemixLogger()
    },
    {
      onBuildStart: hooks.onServerBuildStart,
      async onBuildFinish(context, duration, succeeded) {
        if (succeeded) {
          await hooks.onServerBuildFinish();
        } else {
          outputWarn("\nBuild failed, waiting for changes to restart...");
        }
      },
      async onFileChanged(file) {
        fileWatchCache.invalidateFile(file);
      },
      async onFileDeleted(file) {
        fileWatchCache.invalidateFile(file);
      }
    }
  );
  return {
    async close() {
      await closeWatcher();
    }
  };
}

export { runClassicCompilerDebugCpu };
