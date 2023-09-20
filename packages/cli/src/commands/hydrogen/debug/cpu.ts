import {Flags} from '@oclif/core';
import {joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import Command from '@shopify/cli-kit/node/base-command';
import {outputInfo, outputWarn} from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import {writeFile} from '@shopify/cli-kit/node/fs';
import ansiEscapes from 'ansi-escapes';
import {
  getProjectPaths,
  getRemixConfig,
  handleRemixImportFail,
  type ServerMode,
} from '../../../lib/remix-config.js';
import {createRemixLogger, muteDevLogs} from '../../../lib/log.js';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {createCpuStartupProfiler} from '../../../lib/cpu-profiler.js';

const DEFAULT_OUTPUT_PATH = 'startup.cpuprofile';

export default class DebugCpu extends Command {
  static description = 'Builds and profiles the server startup time the app.';
  static flags = {
    path: commonFlags.path,
    output: Flags.string({
      description: `Specify a path to generate the profile file. Defaults to "${DEFAULT_OUTPUT_PATH}".`,
      default: DEFAULT_OUTPUT_PATH,
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(DebugCpu);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();
    const output = flags.output
      ? resolvePath(flags.output)
      : joinPath(process.cwd(), flags.output);

    await runDebugCpu({
      ...flagsToCamelObject(flags),
      path: directory,
      output,
    });
  }
}

async function runDebugCpu({
  path: appPath,
  output = DEFAULT_OUTPUT_PATH,
}: {
  path?: string;
  output?: string;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  muteDevLogs({workerReload: false});

  const {root, buildPathWorkerFile} = getProjectPaths(appPath);

  outputInfo(
    '⏳️ Starting profiler for CPU startup... Profile will be written to:\n' +
      colors.dim(output),
  );

  const runProfiler = await createCpuStartupProfiler();

  const [{watch}, {createFileWatchCache}] = await Promise.all([
    import('@remix-run/dev/dist/compiler/watch.js'),
    import('@remix-run/dev/dist/compiler/fileWatchCache.js'),
  ]).catch(handleRemixImportFail);

  let times = 0;
  const fileWatchCache = createFileWatchCache();

  await watch(
    {
      config: await getRemixConfig(root),
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
