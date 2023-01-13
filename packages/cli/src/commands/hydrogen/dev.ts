import path from 'path';
import fs from 'fs/promises';
import {output} from '@shopify/cli-kit';
import {copyPublicFiles} from './build.js';
import {getProjectPaths, getRemixConfig} from '../../utils/config.js';
import {muteDevLogs} from '../../utils/log.js';
import {commonFlags} from '../../utils/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import Flags from '@oclif/core/lib/flags.js';
import {startMiniOxygen} from '../../utils/mini-oxygen.js';

const LOG_INITIAL_BUILD = '\n🏁 Initial build';
const LOG_REBUILDING = '🧱 Rebuilding...';
const LOG_REBUILT = '🚀 Rebuilt';

// @ts-ignore
export default class Dev extends Command {
  static description =
    'Runs Hydrogen storefront in a MiniOxygen worker in development';
  static flags = {
    ...commonFlags,
    port: Flags.integer({
      description: 'Port to run the preview server on',
      env: 'SHOPIFY_HYDROGEN_FLAG_PORT',
      default: 3000,
    }),
    entry: Flags.string({
      env: 'SHOPIFY_HYDROGEN_FLAG_ENTRY',
      required: true,
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Dev);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runDev({...flags, path: directory});
  }
}

export async function runDev({
  entry,
  port,
  path: appPath,
}: {
  entry: string;
  port?: number;
  path?: string;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  muteDevLogs();

  await compileAndWatch(getProjectPaths(appPath, entry), {port});
}

async function compileAndWatch(
  projectPaths: ReturnType<typeof getProjectPaths>,
  options: {port?: number; cacheBust?: string} = {},
  isInit = true,
) {
  isInit && console.time(LOG_INITIAL_BUILD);

  const {root, entryFile, publicPath, buildPathClient, buildPathWorkerFile} =
    projectPaths;

  // Changing these files requires re-running `remix.config.js`
  const shouldReloadRemixApp = (file: string) =>
    file.startsWith(path.resolve(root, 'remix.config.'));

  const remixConfig = await getRemixConfig(
    root,
    entryFile,
    publicPath,
    options.cacheBust,
  );

  const copyingFiles = copyPublicFiles(publicPath, buildPathClient);

  const {watch} = await import('@remix-run/dev/dist/compiler/watch.js');
  const stopCompileWatcher = await watch(remixConfig, {
    mode: process.env.NODE_ENV as any,
    async onInitialBuild() {
      await copyingFiles;

      if (isInit) {
        console.timeEnd(LOG_INITIAL_BUILD);

        await startMiniOxygen({
          root,
          port: options.port,
          watch: true,
          buildPathWorkerFile,
          buildPathClient,
        });
      }
    },
    async onFileCreated(file: string) {
      output.info(`\n📄 File created: ${path.relative(root, file)}`);
      if (file.startsWith(publicPath)) {
        await copyPublicFiles(file, file.replace(publicPath, buildPathClient));
      }

      if (shouldReloadRemixApp(file)) {
        await reloadRemixApp(file);
      }
    },
    async onFileChanged(file: string) {
      output.info(`\n📄 File changed: ${path.relative(root, file)}`);
      if (file.startsWith(publicPath)) {
        await copyPublicFiles(file, file.replace(publicPath, buildPathClient));
      }

      if (shouldReloadRemixApp(file)) {
        await reloadRemixApp(file);
      }
    },
    async onFileDeleted(file: string) {
      output.info(`\n📄 File deleted: ${path.relative(root, file)}`);
      if (file.startsWith(publicPath)) {
        await fs.unlink(file.replace(publicPath, buildPathClient));
      }

      if (shouldReloadRemixApp(file)) {
        await reloadRemixApp(file);
      }
    },
    onRebuildStart() {
      output.info(LOG_REBUILDING);
      console.time(LOG_REBUILT);
    },
    async onRebuildFinish() {
      console.timeEnd(LOG_REBUILT);
    },
  });

  async function reloadRemixApp(cacheBust: string) {
    await stopCompileWatcher();
    compileAndWatch(projectPaths, {...options, cacheBust}, false);
  }
}
