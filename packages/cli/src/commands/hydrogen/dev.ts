import path from 'path';
import fs from 'fs/promises';
import {output} from '@shopify/cli-kit';
import {assertEntryFileExists, copyPublicFiles} from './build.js';
import {getProjectPaths, getRemixConfig} from '../../utils/config.js';
import {muteDevLogs} from '../../utils/log.js';
import {commonFlags, flagsToCamelObject} from '../../utils/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import Flags from '@oclif/core/lib/flags.js';
import {startMiniOxygen} from '../../utils/mini-oxygen.js';
import {checkHydrogenVersion} from '../../utils/check-version.js';
import {addVirtualRoutes} from '../../utils/virtual-routes.js';

const LOG_INITIAL_BUILD = '\n🏁 Initial build';
const LOG_REBUILDING = '🧱 Rebuilding...';
const LOG_REBUILT = '🚀 Rebuilt';

export default class Dev extends Command {
  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    entry: commonFlags.entry,
    path: commonFlags.path,
    port: commonFlags.port,
    ['disable-virtual-routes']: Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Dev);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runDev({...flagsToCamelObject(flags), path: directory});
  }
}

export async function runDev({
  entry,
  port,
  path: appPath,
  disableVirtualRoutes,
}: {
  entry: string;
  port?: number;
  path?: string;
  disableVirtualRoutes?: boolean;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  muteDevLogs();

  await compileAndWatch(entry, appPath, port, disableVirtualRoutes);
}

async function compileAndWatch(
  entry: string,
  appPath?: string,
  port?: number,
  disableVirtualRoutes = false,
) {
  console.time(LOG_INITIAL_BUILD);

  const {root, entryFile, publicPath, buildPathClient, buildPathWorkerFile} =
    getProjectPaths(appPath, entry);

  await assertEntryFileExists(entryFile);

  const checkingHydrogenVersion = checkHydrogenVersion(root);

  const copyingFiles = copyPublicFiles(publicPath, buildPathClient);
  const reloadConfig = async () => {
    const config = await getRemixConfig(root, entryFile, publicPath);
    return disableVirtualRoutes ? config : addVirtualRoutes(config);
  };

  const {watch} = await import('@remix-run/dev/dist/compiler/watch.js');
  await watch(await reloadConfig(), {
    reloadConfig,
    mode: process.env.NODE_ENV as any,
    async onInitialBuild() {
      await copyingFiles;

      console.timeEnd(LOG_INITIAL_BUILD);

      await startMiniOxygen({
        root,
        port,
        watch: true,
        buildPathWorkerFile,
        buildPathClient,
      });

      const showUpgrade = await checkingHydrogenVersion;
      if (showUpgrade) showUpgrade();
    },
    async onFileCreated(file: string) {
      output.info(`\n📄 File created: ${path.relative(root, file)}`);
      if (file.startsWith(publicPath)) {
        await copyPublicFiles(file, file.replace(publicPath, buildPathClient));
      }
    },
    async onFileChanged(file: string) {
      output.info(`\n📄 File changed: ${path.relative(root, file)}`);
      if (file.startsWith(publicPath)) {
        await copyPublicFiles(file, file.replace(publicPath, buildPathClient));
      }
    },
    async onFileDeleted(file: string) {
      output.info(`\n📄 File deleted: ${path.relative(root, file)}`);
      if (file.startsWith(publicPath)) {
        await fs.unlink(file.replace(publicPath, buildPathClient));
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
}
