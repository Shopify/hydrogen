import path from 'path';
import fs from 'fs/promises';
import {output} from '@shopify/cli-kit';
import {copyPublicFiles} from './build.js';
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

async function runDev({
  port,
  path: appPath,
  disableVirtualRoutes,
}: {
  port?: number;
  path?: string;
  disableVirtualRoutes?: boolean;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  muteDevLogs();

  console.time(LOG_INITIAL_BUILD);

  const {root, publicPath, buildPathClient, buildPathWorkerFile} =
    getProjectPaths(appPath);

  const checkingHydrogenVersion = checkHydrogenVersion(root);

  const copyingFiles = copyPublicFiles(publicPath, buildPathClient);
  const reloadConfig = async () => {
    const config = await getRemixConfig(root);
    return disableVirtualRoutes ? config : addVirtualRoutes(config);
  };

  const getFilePaths = (file: string) => {
    const fileRelative = path.relative(root, file);
    return [fileRelative, path.resolve(root, fileRelative)] as const;
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
      const [relative, absolute] = getFilePaths(file);
      output.info(`\n📄 File created: ${relative}`);

      if (absolute.startsWith(publicPath)) {
        await copyPublicFiles(
          absolute,
          absolute.replace(publicPath, buildPathClient),
        );
      }
    },
    async onFileChanged(file: string) {
      const [relative, absolute] = getFilePaths(file);
      output.info(`\n📄 File changed: ${relative}`);

      if (absolute.startsWith(publicPath)) {
        await copyPublicFiles(
          absolute,
          absolute.replace(publicPath, buildPathClient),
        );
      }
    },
    async onFileDeleted(file: string) {
      const [relative, absolute] = getFilePaths(file);
      output.info(`\n📄 File deleted: ${relative}`);

      if (absolute.startsWith(publicPath)) {
        await fs.unlink(absolute.replace(publicPath, buildPathClient));
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
