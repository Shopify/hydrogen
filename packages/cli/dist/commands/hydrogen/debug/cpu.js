import { Flags } from '@oclif/core';
import { resolvePath, joinPath } from '@shopify/cli-kit/node/path';
import Command from '@shopify/cli-kit/node/base-command';
import { outputInfo, outputWarn } from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import { writeFile } from '@shopify/cli-kit/node/fs';
import { AbortError } from '@shopify/cli-kit/node/error';
import ansiEscapes from 'ansi-escapes';
import { getProjectPaths, hasRemixConfigFile, handleRemixImportFail, getRemixConfig } from '../../../lib/remix-config.js';
import { muteDevLogs, createRemixLogger } from '../../../lib/log.js';
import { commonFlags, flagsToCamelObject } from '../../../lib/flags.js';
import { createCpuStartupProfiler } from '../../../lib/cpu-profiler.js';
import { createRequire } from 'module';

const require2 = createRequire(import.meta.url);
const DEFAULT_OUTPUT_PATH = "startup.cpuprofile";
class DebugCpu extends Command {
  static descriptionWithMarkdown = `Builds the app and runs the resulting code to profile the server startup time, watching for changes. This command can be used to [debug slow app startup times](https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/cpu-startup) that cause failed deployments in Oxygen.

  The profiling results are written to a \`.cpuprofile\` file that can be viewed with certain tools such as [Flame Chart Visualizer for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-js-profile-flame).`;
  static description = "Builds and profiles the server startup time the app.";
  static flags = {
    ...commonFlags.path,
    output: Flags.string({
      description: `Specify a path to generate the profile file. Defaults to "${DEFAULT_OUTPUT_PATH}".`,
      default: DEFAULT_OUTPUT_PATH,
      required: false
    })
  };
  async run() {
    const { flags } = await this.parse(DebugCpu);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();
    const output = flags.output ? resolvePath(flags.output) : joinPath(process.cwd(), flags.output);
    await runDebugCpu({
      ...flagsToCamelObject(flags),
      path: directory,
      output
    });
  }
}
async function runDebugCpu({
  path: appPath,
  output = DEFAULT_OUTPUT_PATH
}) {
  if (!process.env.NODE_ENV)
    process.env.NODE_ENV = "production";
  muteDevLogs({ workerReload: false });
  const { root, buildPathWorkerFile } = getProjectPaths(appPath);
  if (!await hasRemixConfigFile(root)) {
    throw new AbortError(
      "No remix.config.js file found. This command is not supported in Vite projects."
    );
  }
  outputInfo(
    "\u23F3\uFE0F Starting profiler for CPU startup... Profile will be written to:\n" + colors.dim(output)
  );
  const runProfiler = await createCpuStartupProfiler(root);
  const remixRunWatch = require2.resolve("@remix-run/dev/dist/compiler/watch.js", { paths: [root] });
  const remixRunWatchPath = require2.resolve("@remix-run/dev/dist/compiler/fileWatchCache.js", { paths: [root] });
  const [{ watch }, { createFileWatchCache }] = await Promise.all([
    import(remixRunWatch),
    import(remixRunWatchPath)
  ]).catch(handleRemixImportFail);
  let times = 0;
  const fileWatchCache = createFileWatchCache();
  await watch(
    {
      config: await getRemixConfig(root),
      options: {
        mode: process.env.NODE_ENV,
        sourcemap: true
      },
      fileWatchCache,
      logger: createRemixLogger()
    },
    {
      onBuildStart() {
        if (times > 0) {
          process.stdout.write(ansiEscapes.eraseLines(4));
        }
        outputInfo(`
#${++times} Building and profiling...`);
      },
      async onBuildFinish(context, duration, succeeded) {
        if (succeeded) {
          const { profile, totalScriptTimeMs } = await runProfiler(
            buildPathWorkerFile
          );
          process.stdout.write(ansiEscapes.eraseLines(2));
          outputInfo(
            `#${times} Total time: ${totalScriptTimeMs.toLocaleString()} ms
${colors.dim(output)}`
          );
          await writeFile(output, JSON.stringify(profile, null, 2));
          outputInfo(`
Waiting for changes...`);
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
}

export { DebugCpu as default };
