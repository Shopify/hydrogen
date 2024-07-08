import {Flags} from '@oclif/core';
import {joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import Command from '@shopify/cli-kit/node/base-command';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {writeFile} from '@shopify/cli-kit/node/fs';
import colors from '@shopify/cli-kit/node/colors';
import ansiEscapes from 'ansi-escapes';
import {
  getProjectPaths,
  hasRemixConfigFile,
} from '../../../lib/remix-config.js';
import {muteDevLogs} from '../../../lib/log.js';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {prepareDiffDirectory} from '../../../lib/template-diff.js';
import {runClassicCompilerDebugCpu} from '../../../lib/classic-compiler/debug-cpu.js';
import {setupResourceCleanup} from '../../../lib/resource-cleanup.js';
import {createCpuStartupProfiler} from '../../../lib/cpu-profiler.js';
import {runBuild} from '../build.js';
import {getViteConfig} from '../../../lib/vite-config.js';

const DEFAULT_OUTPUT_PATH = 'startup.cpuprofile';

export default class DebugCpu extends Command {
  static descriptionWithMarkdown = `Builds the app and runs the resulting code to profile the server startup time, watching for changes. This command can be used to [debug slow app startup times](https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/cpu-startup) that cause failed deployments in Oxygen.

  The profiling results are written to a \`.cpuprofile\` file that can be viewed with certain tools such as [Flame Chart Visualizer for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-js-profile-flame).`;

  static description = 'Builds and profiles the server startup time the app.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.diff,
    ...commonFlags.entry,
    output: Flags.string({
      description: `Specify a path to generate the profile file. Defaults to "${DEFAULT_OUTPUT_PATH}".`,
      default: DEFAULT_OUTPUT_PATH,
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(DebugCpu);
    const originalDirectory = flags.path
      ? resolvePath(flags.path)
      : process.cwd();

    const diff = flags.diff
      ? await prepareDiffDirectory(originalDirectory, true)
      : undefined;

    const {close} = await runDebugCpu({
      ...flagsToCamelObject(flags),
      directory: diff?.targetDirectory ?? originalDirectory,
      output: resolvePath(originalDirectory, flags.output),
    });

    setupResourceCleanup(async () => {
      await close();
      await diff?.cleanup();
    });
  }
}

type RunDebugCpuOptions = {
  directory: string;
  output: string;
  entry?: string;
};

async function runDebugCpu({directory, entry, output}: RunDebugCpuOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

  muteDevLogs({workerReload: false});

  let {buildPath, buildPathWorkerFile} = getProjectPaths(directory);

  const isClassicProject = await hasRemixConfigFile(directory);

  outputInfo(
    '⏳️ Starting profiler for CPU startup... Profile will be written to:\n' +
      colors.dim(output),
  );

  let times = 0;
  let sourceEntrypoint: string;
  const profiler = await createCpuStartupProfiler(directory);

  const hooks = {
    onServerBuildStart() {
      if (times > 0) {
        process.stdout.write(ansiEscapes.eraseLines(4));
      }

      outputInfo(`\n#${++times} Building and profiling...`);
    },
    async onServerBuildFinish() {
      const {profile, totalScriptTimeMs} = await profiler.run(
        buildPathWorkerFile,
        sourceEntrypoint,
      );

      process.stdout.write(ansiEscapes.eraseLines(2));
      outputInfo(
        `#${times} Total time: ${totalScriptTimeMs.toLocaleString()} ms` +
          `\n${colors.dim(output)}`,
      );

      await writeFile(output, JSON.stringify(profile, null, 2));

      outputInfo(`\nWaiting for changes...`);
    },
  };

  if (isClassicProject) {
    return runClassicCompilerDebugCpu({
      directory,
      output,
      buildPathWorkerFile,
      hooks,
    });
  }

  const maybeViteConfig = await getViteConfig(directory).catch(() => null);
  buildPathWorkerFile =
    maybeViteConfig?.serverOutFile ?? joinPath(buildPath, 'server', 'index.js');

  sourceEntrypoint = maybeViteConfig?.remixConfig.serverEntryPoint ?? '';

  const buildProcess = await runBuild({
    entry,
    directory,
    watch: true,
    sourcemap: true,
    disableRouteWarning: true,
    lockfileCheck: false,
    ...hooks,
    onServerBuildStart() {
      if (times === 0) {
        process.stdout.write(ansiEscapes.eraseLines(1));
      }
      return hooks.onServerBuildStart();
    },
  });

  return {
    async close() {
      await Promise.allSettled([buildProcess.close(), profiler.close()]);
    },
  };
}
