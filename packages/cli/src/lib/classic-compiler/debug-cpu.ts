import ansiEscapes from 'ansi-escapes';
import {outputInfo, outputWarn} from '@shopify/cli-kit/node/output';
import {writeFile} from '@shopify/cli-kit/node/fs';
import colors from '@shopify/cli-kit/node/colors';
import {createCpuStartupProfiler} from '../cpu-profiler.js';
import {createRemixLogger} from '../log.js';
import {
  getRemixConfig,
  handleRemixImportFail,
  type RemixConfig,
  type ServerMode,
} from '../remix-config.js';

type DebugOptions = {
  root: string;
  output: string;
  buildPathWorkerFile: string;
};

export async function runClassicCompilerDebugCpu({
  root,
  output,
  buildPathWorkerFile,
}: DebugOptions) {
  const runProfiler = await createCpuStartupProfiler();

  const [{watch}, {createFileWatchCache}] = await Promise.all([
    import('@remix-run/dev/dist/compiler/watch.js'),
    import('@remix-run/dev/dist/compiler/fileWatchCache.js'),
  ]).catch(handleRemixImportFail);

  let times = 0;
  const fileWatchCache = createFileWatchCache();

  await watch(
    {
      config: (await getRemixConfig(root)) as RemixConfig,
      options: {
        mode: process.env.NODE_ENV as ServerMode,
        sourcemap: true,
      },
      fileWatchCache,
      logger: createRemixLogger(),
    },
    {
      onBuildStart() {
        if (times > 0) {
          process.stdout.write(ansiEscapes.eraseLines(4));
        }

        outputInfo(`\n#${++times} Building and profiling...`);
      },
      async onBuildFinish(context, duration, succeeded) {
        if (succeeded) {
          const {profile, totalScriptTimeMs} = await runProfiler(
            buildPathWorkerFile,
          );

          process.stdout.write(ansiEscapes.eraseLines(2));
          outputInfo(
            `#${times} Total time: ${totalScriptTimeMs.toLocaleString()} ms` +
              `\n${colors.dim(output)}`,
          );

          await writeFile(output, JSON.stringify(profile, null, 2));

          outputInfo(`\nWaiting for changes...`);
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
}
