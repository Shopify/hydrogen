import path from 'path';
import fs from 'fs/promises';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {copyPublicFiles} from './build.js';
import {getProjectPaths, getRemixConfig} from '../../lib/config.js';
import {muteDevLogs} from '../../lib/log.js';
import {deprecated, commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {startMiniOxygen} from '../../lib/mini-oxygen.js';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {addVirtualRoutes} from '../../lib/virtual-routes.js';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {combinedEnvironmentVariables} from '../../lib/combined-environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';

const LOG_INITIAL_BUILD = '\n🏁 Initial build';
const LOG_REBUILDING = '🧱 Rebuilding...';
const LOG_REBUILT = '🚀 Rebuilt';

export default class Dev extends Command {
  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    path: commonFlags.path,
    port: commonFlags.port,
    ['codegen-unstable']: Flags.boolean({
      description:
        'Generate types for the Storefront API queries found in your project. It updates the types on file save.',
      required: false,
      default: false,
    }),
    ['codegen-config-path']: Flags.string({
      description:
        'Specify a path to a codegen configuration file. Defaults to `<root>/codegen.ts` if it exists.',
      required: false,
      dependsOn: ['codegen-unstable'],
    }),
    ['disable-virtual-routes']: Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist.",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
    shop: commonFlags.shop,
    debug: Flags.boolean({
      description: 'Attaches a Node inspector',
      env: 'SHOPIFY_HYDROGEN_FLAG_DEBUG',
      default: false,
    }),
    host: deprecated('--host')(),
    ['env-branch']: commonFlags['env-branch'],
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Dev);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runDev({
      ...flagsToCamelObject(flags),
      codegen: flags['codegen-unstable'],
      path: directory,
    });
  }
}

async function runDev({
  port,
  path: appPath,
  codegen = false,
  codegenConfigPath,
  disableVirtualRoutes,
  shop,
  envBranch,
  debug = false,
}: {
  port?: number;
  path?: string;
  codegen?: boolean;
  codegenConfigPath?: string;
  disableVirtualRoutes?: boolean;
  shop?: string;
  envBranch?: string;
  debug?: false;
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  muteDevLogs();

  if (debug) (await import('node:inspector')).open();

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

  const serverBundleExists = () => fileExists(buildPathWorkerFile);

  const hasLinkedStorefront = !!(await getConfig(root))?.storefront?.id;
  const environmentVariables = hasLinkedStorefront
    ? await combinedEnvironmentVariables({
        root,
        shop,
        envBranch,
      })
    : undefined;

  let miniOxygenStarted = false;
  async function safeStartMiniOxygen() {
    if (miniOxygenStarted) return;

    await startMiniOxygen({
      root,
      port,
      watch: true,
      buildPathWorkerFile,
      buildPathClient,
      environmentVariables,
    });

    miniOxygenStarted = true;

    const showUpgrade = await checkingHydrogenVersion;
    if (showUpgrade) showUpgrade();
  }

  const {watch} = await import('@remix-run/dev/dist/compiler/watch.js');

  const remixConfig = await reloadConfig();

  if (codegen) {
    spawnCodegenProcess({...remixConfig, configFilePath: codegenConfigPath});
  }

  await watch(remixConfig, {
    reloadConfig,
    mode: process.env.NODE_ENV as any,
    async onInitialBuild() {
      await copyingFiles;

      if (!(await serverBundleExists())) {
        const {renderFatalError} = await import('@shopify/cli-kit/node/ui');
        return renderFatalError({
          name: 'BuildError',
          type: 0,
          message:
            'MiniOxygen cannot start because the server bundle has not been generated.',
          tryMessage:
            'This is likely due to an error in your app and Remix is unable to compile. Try fixing the app and MiniOxygen will start.',
        });
      }

      console.timeEnd(LOG_INITIAL_BUILD);
      await safeStartMiniOxygen();
    },
    async onFileCreated(file: string) {
      const [relative, absolute] = getFilePaths(file);
      outputInfo(`\n📄 File created: ${relative}`);

      if (absolute.startsWith(publicPath)) {
        await copyPublicFiles(
          absolute,
          absolute.replace(publicPath, buildPathClient),
        );
      }
    },
    async onFileChanged(file: string) {
      const [relative, absolute] = getFilePaths(file);
      outputInfo(`\n📄 File changed: ${relative}`);

      if (absolute.startsWith(publicPath)) {
        await copyPublicFiles(
          absolute,
          absolute.replace(publicPath, buildPathClient),
        );
      }
    },
    async onFileDeleted(file: string) {
      const [relative, absolute] = getFilePaths(file);
      outputInfo(`\n📄 File deleted: ${relative}`);

      if (absolute.startsWith(publicPath)) {
        await fs.unlink(absolute.replace(publicPath, buildPathClient));
      }
    },
    onRebuildStart() {
      outputInfo(LOG_REBUILDING);
      console.time(LOG_REBUILT);
    },
    async onRebuildFinish() {
      console.timeEnd(LOG_REBUILT);

      if (!miniOxygenStarted && (await serverBundleExists())) {
        console.log(''); // New line
        await safeStartMiniOxygen();
      }
    },
  });
}
