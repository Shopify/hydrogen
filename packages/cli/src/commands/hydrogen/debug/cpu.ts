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
import {
  cpuJsonOutputSchema,
  type CpuWatchRecord,
} from '../../../lib/cpu-profiler/types.js';
import {
  getWatchError,
  runWatchCommand,
  writeWatchRecord,
} from '../../../lib/watch.js';
import type {BuildResult} from '../../../lib/build-tooling/types.js';

const DEFAULT_OUTPUT_PATH = 'startup.cpuprofile';

export default class DebugCpu extends Command {
  static get jsonOutputSchema(): typeof cpuJsonOutputSchema {
    return cpuJsonOutputSchema;
  }

  static descriptionWithMarkdown = `Builds the app and runs the resulting code to profile the server startup time, watching for changes. This command can be used to [debug slow app startup times](https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/cpu-startup) that cause failed deployments in Oxygen.

  The profiling results are written to a \`.cpuprofile\` file that can be viewed with certain tools such as [Flame Chart Visualizer for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-js-profile-flame).

  With \`--json\`, emits JSONL lifecycle, build, and profile records to stdout and diagnostics to stderr until stopped. Failed records include \`error.message\` and may include \`error.tryMessage\` with recovery guidance; JSON consumers should read both fields. The native profile file format is unchanged.`;

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
      await runWatchCommand((signal) =>
        runDebugCpuWatch(
          {
            ...flagsToCamelObject(flags),
            directory,
            output: resolvePath(directory, flags.output),
          },
          signal,
          (record) => writeWatchRecord(cpuJsonOutputSchema, record),
        ),
      );
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
};

async function getSourceEntrypoint(directory: string) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
  if (await isClassicProject(directory)) {
    throw new AbortError(REMIX_COMPILER_ERROR_MESSAGE);
  }
  const config = await getViteConfig(directory).catch(() => null);
  return config?.remixConfig.serverEntryPoint ?? '';
}

export async function runDebugCpu({
  directory,
  entry,
  output,
}: RunDebugCpuOptions) {
  muteDevLogs({workerReload: false});
  outputInfo(
    '⏳️ Starting profiler for CPU startup... Profile will be written to:\n' +
      colors.dim(output),
  );
  const sourceEntrypoint = await getSourceEntrypoint(directory);
  const profiler = await createCpuStartupProfiler();
  let times = 0;
  return runBuild({
    json: false,
    entry,
    directory,
    watch: true,
    sourcemap: true,
    disableRouteWarning: true,
    lockfileCheck: false,
    bundleStats: false,
    onServerBuildStart() {
      process.stdout.write(ansiEscapes.eraseLines(times === 0 ? 1 : 4));
      outputInfo(`\n#${++times} Building and profiling...`);
    },
    async onServerBuildFinish(_cycle, result) {
      const {profile, totalScriptTimeMs} = await profiler.run(
        result.serverPath,
        sourceEntrypoint,
      );
      process.stdout.write(ansiEscapes.eraseLines(2));
      outputInfo(
        `#${times} Total time: ${totalScriptTimeMs.toLocaleString()} ms` +
          `\n${colors.dim(output)}`,
      );
      await writeFile(output, JSON.stringify(profile, null, 2));
      outputInfo('\nWaiting for changes...');
    },
  });
}

export async function runDebugCpuWatch(
  {directory, entry, output}: RunDebugCpuOptions,
  signal: AbortSignal,
  onRecord: (record: CpuWatchRecord) => void,
) {
  const sourceEntrypoint = await getSourceEntrypoint(directory);
  const profiler = await createCpuStartupProfiler();
  let closing = false;
  let stopped = false;
  let profiling: Promise<void> | undefined;
  const emit = (record: CpuWatchRecord) => {
    if (!stopped) onRecord(record);
  };
  const profileBuild = async (cycle: number, result: BuildResult) => {
    emit({type: 'build-completed', cycle, ...result});
    emit({type: 'profile-started', cycle});
    try {
      const {profile, totalScriptTimeMs, totalTimeMs} = await profiler.run(
        result.serverPath,
        sourceEntrypoint,
      );
      if (stopped) return;
      await writeFile(output, JSON.stringify(profile, null, 2));
      emit({
        type: 'profile-completed',
        cycle,
        path: output,
        format: 'cpuprofile',
        totalTimeMs,
        totalScriptTimeMs,
      });
    } catch (error) {
      emit({type: 'profile-failed', cycle, error: getWatchError(error)});
    }
  };
  emit({type: 'watch-started', directory: resolvePath(directory)});
  const build = await runBuild({
    json: true,
    entry,
    directory,
    watch: true,
    rebuildServerOnClientChange: true,
    sourcemap: true,
    disableRouteWarning: true,
    lockfileCheck: false,
    bundleStats: false,
    onBuildStart: (cycle) => emit({type: 'build-started', cycle}),
    onBuildError: (cycle, error) =>
      emit({type: 'build-failed', cycle, error: getWatchError(error)}),
    onServerBuildStart: () => profiling,
    onBuildFinish(cycle, result) {
      if (closing) return;
      profiling = profileBuild(cycle, result);
    },
  });
  try {
    if (!signal.aborted)
      await new Promise<void>((resolve) =>
        signal.addEventListener('abort', () => resolve(), {once: true}),
      );
  } finally {
    closing = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // A server rebuild can wait for profiling before writing its next bundle.
      await Promise.race([
        build.close().finally(() => profiling),
        new Promise<void>((resolve) => {
          timeout = setTimeout(resolve, 3000);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
      stopped = true;
    }
  }
  onRecord({type: 'watch-stopped'});
}
