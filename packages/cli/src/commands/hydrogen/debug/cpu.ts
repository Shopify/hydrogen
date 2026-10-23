import {Flags} from '@oclif/core';
import {resolvePath} from '@shopify/cli-kit/node/path';
import Command from '../../../lib/hydrogen-command.js';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {writeFile} from '@shopify/cli-kit/node/fs';
import colors from '@shopify/cli-kit/node/colors';
import ansiEscapes from 'ansi-escapes';
import {isClassicProject} from '../../../lib/remix-config.js';
import {muteDevLogs} from '../../../lib/log.js';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {setupResourceCleanup} from '../../../lib/resource-cleanup.js';
import {createCpuStartupProfiler} from '../../../lib/cpu-profiler.js';
import {runBuild} from '../build.js';
import {
  getViteConfig,
  REMIX_COMPILER_ERROR_MESSAGE,
} from '../../../lib/vite-config.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {isJsonOutput} from '../../../lib/json-output.js';
import {
  cpuJsonOutputSchema,
  type CpuWatchRecord,
} from '../../../lib/cpu-profiler/types.js';
import {runWatchCommand, writeWatchRecord} from '../../../lib/watch.js';
import type {BuildResult} from '../../../lib/build-tooling/types.js';

const DEFAULT_OUTPUT_PATH = 'startup.cpuprofile';

export default class DebugCpu extends Command {
  static get jsonOutputSchema(): typeof cpuJsonOutputSchema {
    return cpuJsonOutputSchema;
  }

  static descriptionWithMarkdown = `Builds the app and runs the resulting code to profile the server startup time, watching for changes. This command can be used to [debug slow app startup times](https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/cpu-startup) that cause failed deployments in Oxygen.

  The profiling results are written to a \`.cpuprofile\` file that can be viewed with certain tools such as [Flame Chart Visualizer for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-js-profile-flame).

  With \`--json\`, emits JSONL lifecycle, build, and profile records to stdout and diagnostics to stderr until stopped. The native profile file format is unchanged.`;

  static description = this.descriptionForHelp();
  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
    ...commonFlags.entry,
    output: Flags.string({
      description: `Specify a path to generate the profile file. Defaults to "${DEFAULT_OUTPUT_PATH}".`,
      default: DEFAULT_OUTPUT_PATH,
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(DebugCpu);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    if (flags.json) {
      await runWatchCommand(async (signal) => {
        const {close} = await runDebugCpu({
          ...flagsToCamelObject(flags),
          directory,
          output: resolvePath(directory, flags.output),
          onRecord: (record) => writeWatchRecord(cpuJsonOutputSchema, record),
        });
        try {
          if (!signal.aborted)
            await new Promise<void>((resolve) =>
              signal.addEventListener('abort', () => resolve(), {once: true}),
            );
        } finally {
          await close();
        }
      });
      return;
    }

    const {close} = await runDebugCpu({
      ...flagsToCamelObject(flags),
      directory,
      output: resolvePath(directory, flags.output),
    });

    setupResourceCleanup(async () => {
      await close();
    });
  }
}

type RunDebugCpuOptions = {
  directory: string;
  output: string;
  entry?: string;
  json?: boolean;
  onRecord?: (record: CpuWatchRecord) => void;
};

export async function runDebugCpu({
  directory,
  entry,
  output,
  json = isJsonOutput(),
  onRecord,
}: RunDebugCpuOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  if (!json) muteDevLogs({workerReload: false});

  if (!json)
    outputInfo(
      '⏳️ Starting profiler for CPU startup... Profile will be written to:\n' +
        colors.dim(output),
    );

  let times = 0;
  let cycle = 0;
  let sourceEntrypoint: string;
  const profiler = await createCpuStartupProfiler();

  const hooks = {
    onServerBuildStart() {
      if (json) return;
      if (times > 0) {
        process.stdout.write(ansiEscapes.eraseLines(4));
      }

      outputInfo(`\n#${++times} Building and profiling...`);
    },
    async onServerBuildFinish(result: BuildResult) {
      if (json) {
        onRecord?.({type: 'build-completed', cycle, ...result});
        onRecord?.({type: 'profile-started', cycle});
      }
      try {
        const {profile, totalScriptTimeMs, totalTimeMs} = await profiler.run(
          result.serverPath,
          sourceEntrypoint,
        );

        if (!json) {
          process.stdout.write(ansiEscapes.eraseLines(2));
          outputInfo(
            `#${times} Total time: ${totalScriptTimeMs.toLocaleString()} ms` +
              `\n${colors.dim(output)}`,
          );
        }

        await writeFile(output, JSON.stringify(profile, null, 2));

        if (json)
          onRecord?.({
            type: 'profile-completed',
            cycle,
            path: output,
            format: 'cpuprofile',
            totalTimeMs,
            totalScriptTimeMs,
          });
        else outputInfo(`\nWaiting for changes...`);
      } catch (error) {
        if (!json) throw error;
        onRecord?.({
          type: 'profile-failed',
          cycle,
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    },
  };

  const isClassicCompiler = await isClassicProject(directory);

  if (isClassicCompiler) {
    throw new AbortError(REMIX_COMPILER_ERROR_MESSAGE);
  }

  const maybeViteConfig = await getViteConfig(directory).catch(() => null);
  sourceEntrypoint = maybeViteConfig?.remixConfig.serverEntryPoint ?? '';

  if (json)
    onRecord?.({type: 'watch-started', directory: resolvePath(directory)});
  const buildProcess = await runBuild({
    json,
    entry,
    directory,
    watch: true,
    sourcemap: true,
    disableRouteWarning: true,
    lockfileCheck: false,
    bundleStats: false,
    ...hooks,
    ...(json
      ? {
          onBuildStart(buildCycle: number) {
            cycle = buildCycle;
            onRecord?.({type: 'build-started', cycle});
          },
          onBuildError(buildCycle: number, error: Error) {
            onRecord?.({
              type: 'build-failed',
              cycle: buildCycle,
              error: {message: error.message},
            });
          },
        }
      : {}),
    onServerBuildStart() {
      if (!json && times === 0) {
        process.stdout.write(ansiEscapes.eraseLines(1));
      }
      return hooks.onServerBuildStart();
    },
  });

  let closing: Promise<void> | undefined;
  return {
    close() {
      closing ??= buildProcess.close().then(() => {
        if (json) onRecord?.({type: 'watch-stopped'});
      });
      return closing;
    },
  };
}
