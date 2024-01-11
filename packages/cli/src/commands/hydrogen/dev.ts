import path from 'node:path';
import fs from 'node:fs/promises';
import type {ChildProcess} from 'node:child_process';
import {outputDebug, outputInfo} from '@shopify/cli-kit/node/output';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {renderFatalError} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {copyPublicFiles} from './build.js';
import {
  assertOxygenChecks,
  getProjectPaths,
  getRemixConfig,
  handleRemixImportFail,
  type ServerMode,
} from '../../lib/remix-config.js';
import {createRemixLogger, enhanceH2Logs, muteDevLogs} from '../../lib/log.js';
import {
  deprecated,
  commonFlags,
  flagsToCamelObject,
  overrideFlag,
} from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {
  type MiniOxygen,
  startMiniOxygen,
  buildAssetsUrl,
} from '../../lib/mini-oxygen/index.js';
import {addVirtualRoutes} from '../../lib/virtual-routes.js';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {setupLiveReload} from '../../lib/live-reload.js';
import {checkRemixVersions} from '../../lib/remix-version-check.js';
import {getGraphiQLUrl} from '../../lib/graphiql-url.js';
import {displayDevUpgradeNotice} from './upgrade.js';
import {findPort} from '../../lib/find-port.js';

const LOG_REBUILDING = '🧱 Rebuilding...';
const LOG_REBUILT = '🚀 Rebuilt';

export default class Dev extends Command {
  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    path: commonFlags.path,
    port: commonFlags.port,
    worker: commonFlags.workerRuntime,
    codegen: overrideFlag(commonFlags.codegen, {
      description:
        commonFlags.codegen.description! +
        ' It updates the types on file save.',
    }),
    'codegen-config-path': commonFlags.codegenConfigPath,
    sourcemap: commonFlags.sourcemap,
    'disable-virtual-routes': Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist.",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
    debug: commonFlags.debug,
    'inspector-port': commonFlags.inspectorPort,
    host: deprecated('--host')(),
    ['env-branch']: commonFlags.envBranch,
    ['disable-version-check']: Flags.boolean({
      description: 'Skip the version check when running `hydrogen dev`',
      default: false,
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Dev);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runDev({
      ...flagsToCamelObject(flags),
      path: directory,
    });
  }
}

type DevOptions = {
  port: number;
  path?: string;
  codegen?: boolean;
  worker?: boolean;
  codegenConfigPath?: string;
  disableVirtualRoutes?: boolean;
  disableVersionCheck?: boolean;
  envBranch?: string;
  debug?: boolean;
  sourcemap?: boolean;
  inspectorPort: number;
};

export async function runDev({
  port: appPort,
  path: appPath,
  codegen: useCodegen = false,
  worker: workerRuntime = false,
  codegenConfigPath,
  disableVirtualRoutes,
  envBranch,
  debug = false,
  sourcemap = true,
  disableVersionCheck = false,
  inspectorPort,
}: DevOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  muteDevLogs();

  const {root, publicPath, buildPathClient, buildPathWorkerFile} =
    getProjectPaths(appPath);

  const copyingFiles = copyPublicFiles(publicPath, buildPathClient);
  const reloadConfig = async () => {
    const config = await getRemixConfig(root);

    return disableVirtualRoutes
      ? config
      : addVirtualRoutes(config).catch((error) => {
          // Seen this fail when somehow NPM doesn't publish
          // the full 'virtual-routes' directory.
          // E.g. https://unpkg.com/browse/@shopify/cli-hydrogen@0.0.0-next-aa15969-20230703072007/dist/virtual-routes/
          outputDebug(
            'Could not add virtual routes: ' +
              (error?.stack ?? error?.message ?? error),
          );

          return config;
        });
  };

  const getFilePaths = (file: string) => {
    const fileRelative = path.relative(root, file);
    return [fileRelative, path.resolve(root, fileRelative)] as const;
  };

  const serverBundleExists = () => fileExists(buildPathWorkerFile);

  inspectorPort = debug ? await findPort(inspectorPort) : inspectorPort;
  appPort = workerRuntime ? await findPort(appPort) : appPort; // findPort is already called for Node sandbox

  const assetsPort = workerRuntime ? await findPort(appPort + 100) : 0;
  if (assetsPort) {
    // Note: Set this env before loading Remix config!
    process.env.HYDROGEN_ASSET_BASE_URL = buildAssetsUrl(assetsPort);
  }

  const [remixConfig, {shop, storefront}] = await Promise.all([
    reloadConfig(),
    getConfig(root),
  ]);

  assertOxygenChecks(remixConfig);

  const fetchRemote = !!shop && !!storefront?.id;
  const envPromise = getAllEnvironmentVariables({root, fetchRemote, envBranch});

  const [{watch}, {createFileWatchCache}] = await Promise.all([
    import('@remix-run/dev/dist/compiler/watch.js'),
    import('@remix-run/dev/dist/compiler/fileWatchCache.js'),
  ]).catch(handleRemixImportFail);

  let isInitialBuild = true;
  let initialBuildDurationMs = 0;
  let initialBuildStartTimeMs = Date.now();

  const liveReload = true // TODO: option to disable HMR?
    ? await setupLiveReload(remixConfig.dev?.port ?? 8002)
    : undefined;

  let miniOxygen: MiniOxygen;
  let codegenProcess: ChildProcess;
  async function safeStartMiniOxygen() {
    if (miniOxygen) return;

    miniOxygen = await startMiniOxygen(
      {
        root,
        debug,
        assetsPort,
        inspectorPort,
        port: appPort,
        watch: !liveReload,
        buildPathWorkerFile,
        buildPathClient,
        env: await envPromise,
      },
      workerRuntime,
    );

    enhanceH2Logs({host: miniOxygen.listeningAt, ...remixConfig});

    miniOxygen.showBanner({
      appName: storefront ? colors.cyan(storefront?.title) : undefined,
      headlinePrefix:
        initialBuildDurationMs > 0
          ? `Initial build: ${initialBuildDurationMs}ms\n`
          : '',
      extraLines: [
        colors.dim(
          `\nView GraphiQL API browser: ${getGraphiQLUrl({
            host: miniOxygen.listeningAt,
          })}`,
        ),
        colors.dim(
          `\nView server-side network requests: ${miniOxygen.listeningAt}/debug-network`,
        ),
      ],
    });

    if (useCodegen) {
      codegenProcess = spawnCodegenProcess({
        ...remixConfig,
        configFilePath: codegenConfigPath,
      });
    }

    checkRemixVersions();

    if (!disableVersionCheck) {
      displayDevUpgradeNotice({targetPath: appPath});
    }
  }

  const fileWatchCache = createFileWatchCache();
  let skipRebuildLogs = false;

  const closeWatcher = await watch(
    {
      config: remixConfig,
      options: {
        mode: process.env.NODE_ENV as ServerMode,
        sourcemap,
      },
      fileWatchCache,
      logger: createRemixLogger(),
    },
    {
      reloadConfig,
      onBuildStart(ctx) {
        if (!isInitialBuild && !skipRebuildLogs) {
          outputInfo(LOG_REBUILDING);
          console.time(LOG_REBUILT);
        }

        liveReload?.onBuildStart(ctx);
      },
      onBuildManifest: liveReload?.onBuildManifest,
      async onBuildFinish(context, duration, succeeded) {
        if (isInitialBuild) {
          await copyingFiles;
          initialBuildDurationMs = Date.now() - initialBuildStartTimeMs;
          isInitialBuild = false;
        } else if (!skipRebuildLogs) {
          skipRebuildLogs = false;
          console.timeEnd(LOG_REBUILT);
          if (!miniOxygen) console.log(''); // New line
        }

        if (!miniOxygen && !(await serverBundleExists())) {
          return renderFatalError({
            name: 'BuildError',
            type: 0,
            message:
              'MiniOxygen cannot start because the server bundle has not been generated.',
            skipOclifErrorHandling: true,
            tryMessage:
              'This is likely due to an error in your app and Remix is unable to compile. Try fixing the app and MiniOxygen will start.',
          });
        }

        if (succeeded) {
          if (!miniOxygen) {
            await safeStartMiniOxygen();
          } else if (liveReload) {
            await miniOxygen.reload();
          }

          liveReload?.onAppReady(context);
        }
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
        fileWatchCache.invalidateFile(file);

        const [relative, absolute] = getFilePaths(file);
        outputInfo(`\n📄 File changed: ${relative}`);

        if (relative.endsWith('.env')) {
          skipRebuildLogs = true;
          await miniOxygen.reload({
            env: await getAllEnvironmentVariables({
              root,
              fetchRemote,
              envBranch,
            }),
          });
        }

        if (absolute.startsWith(publicPath)) {
          await copyPublicFiles(
            absolute,
            absolute.replace(publicPath, buildPathClient),
          );
        }
      },
      async onFileDeleted(file: string) {
        fileWatchCache.invalidateFile(file);

        const [relative, absolute] = getFilePaths(file);
        outputInfo(`\n📄 File deleted: ${relative}`);

        if (absolute.startsWith(publicPath)) {
          await fs.unlink(absolute.replace(publicPath, buildPathClient));
        }
      },
    },
  );

  return {
    async close() {
      codegenProcess?.kill(0);
      await Promise.all([closeWatcher(), miniOxygen?.close()]);
    },
  };
}
