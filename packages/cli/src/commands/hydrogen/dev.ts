import fs from 'node:fs/promises';
import type {ChildProcess} from 'node:child_process';
import {outputDebug, outputInfo} from '@shopify/cli-kit/node/output';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {renderFatalError} from '@shopify/cli-kit/node/ui';
import {relativePath, resolvePath} from '@shopify/cli-kit/node/path';
import {copyPublicFiles} from './build.js';
import {
  type RemixConfig,
  assertOxygenChecks,
  getProjectPaths,
  getRemixConfig,
  handleRemixImportFail,
  type ServerMode,
} from '../../lib/remix-config.js';
import {
  createRemixLogger,
  enhanceH2Logs,
  muteDevLogs,
  isH2Verbose,
  setH2OVerbose,
} from '../../lib/log.js';
import {
  DEFAULT_APP_PORT,
  commonFlags,
  deprecated,
  flagsToCamelObject,
} from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags, Config} from '@oclif/core';
import {
  type MiniOxygen,
  startMiniOxygen,
  buildAssetsUrl,
} from '../../lib/mini-oxygen/index.js';
import {addVirtualRoutes} from '../../lib/virtual-routes.js';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {setupLiveReload} from '../../lib/live-reload.js';
import {checkRemixVersions} from '../../lib/remix-version-check.js';
import {displayDevUpgradeNotice} from './upgrade.js';
import {findPort} from '../../lib/find-port.js';
import {
  copyShopifyConfig,
  prepareDiffDirectory,
} from '../../lib/template-diff.js';
import {
  startTunnelAndPushConfig,
  getDevConfigInBackground,
  isMockShop,
  notifyIssueWithTunnelAndMockShop,
} from '../../lib/dev-shared.js';
import {getCliCommand} from '../../lib/shell.js';
import {hasViteConfig} from '../../lib/vite-config.js';

const LOG_REBUILDING = '🧱 Rebuilding...';
const LOG_REBUILT = '🚀 Rebuilt';

export default class Dev extends Command {
  static descriptionWithMarkdown = `Runs a Hydrogen storefront in a local runtime that emulates an Oxygen worker for development.

  If your project is [linked](https://shopify.dev/docs/api/shopify-cli/hydrogen-commands/hydrogen-link) to a Hydrogen storefront, then its environment variables will be loaded with the runtime.`;

  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.port,
    worker: deprecated('--worker', {isBoolean: true}),
    ...commonFlags.legacyRuntime,
    ...commonFlags.codegen,
    ...commonFlags.sourcemap,
    'disable-virtual-routes': Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist.",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
    ...commonFlags.debug,
    ...commonFlags.inspectorPort,
    ...commonFlags.env,
    ...commonFlags.envBranch,
    'disable-version-check': Flags.boolean({
      description: 'Skip the version check when running `hydrogen dev`',
      default: false,
      required: false,
    }),
    ...commonFlags.diff,
    ...commonFlags.customerAccountPush,
    ...commonFlags.verbose,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Dev);
    const originalDirectory = flags.path
      ? resolvePath(flags.path)
      : process.cwd();
    let directory = originalDirectory;

    if (flags.diff) {
      directory = await prepareDiffDirectory(directory, true);
    }

    const devParams = {
      ...flagsToCamelObject(flags),
      customerAccountPush: flags['customer-account-push__unstable'],
      path: directory,
      cliConfig: this.config,
    };

    if (await hasViteConfig(directory ?? process.cwd())) {
      const {runViteDev} = await import('./dev-vite.js');
      await runViteDev(devParams);
    } else {
      await runDev(devParams);
    }

    if (flags.diff) {
      await copyShopifyConfig(directory, originalDirectory);
    }
  }
}

type DevOptions = {
  port?: number;
  path?: string;
  codegen?: boolean;
  legacyRuntime?: boolean;
  codegenConfigPath?: string;
  disableVirtualRoutes?: boolean;
  disableVersionCheck?: boolean;
  env?: string;
  envBranch?: string;
  debug?: boolean;
  sourcemap?: boolean;
  inspectorPort?: number;
  customerAccountPush?: boolean;
  cliConfig: Config;
  shouldLiveReload?: boolean;
  verbose?: boolean;
};

export async function runDev({
  port: appPort,
  path: appPath,
  codegen: useCodegen = false,
  legacyRuntime = false,
  codegenConfigPath,
  disableVirtualRoutes,
  env: envHandle,
  envBranch,
  debug = false,
  sourcemap = true,
  disableVersionCheck = false,
  inspectorPort,
  customerAccountPush: customerAccountPushFlag = false,
  shouldLiveReload = true,
  cliConfig,
  verbose,
}: DevOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  if (verbose) setH2OVerbose();
  if (!isH2Verbose()) muteDevLogs();

  const {root, publicPath, buildPathClient, buildPathWorkerFile} =
    getProjectPaths(appPath);

  const copyFilesPromise = copyPublicFiles(publicPath, buildPathClient);
  const cliCommandPromise = getCliCommand(root);

  const reloadConfig = async () => {
    const config = (await getRemixConfig(root)) as RemixConfig;

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
    const fileRelative = relativePath(root, file);
    return [fileRelative, resolvePath(root, fileRelative)] as const;
  };

  const serverBundleExists = () => fileExists(buildPathWorkerFile);

  if (!appPort) {
    appPort = await findPort(DEFAULT_APP_PORT);
  }

  const assetsPort = legacyRuntime ? 0 : await findPort(appPort + 100);
  if (assetsPort) {
    // Note: Set this env before loading Remix config!
    process.env.HYDROGEN_ASSET_BASE_URL = await buildAssetsUrl(assetsPort);
  }

  const backgroundPromise = getDevConfigInBackground(
    root,
    customerAccountPushFlag,
  );

  const tunnelPromise =
    cliConfig &&
    backgroundPromise.then(({customerAccountPush, storefrontId}) => {
      if (customerAccountPush) {
        return startTunnelAndPushConfig(
          root,
          cliConfig,
          appPort!,
          storefrontId,
        );
      }
    });

  const remixConfig = await reloadConfig();
  assertOxygenChecks(remixConfig);

  const envPromise = backgroundPromise.then(({fetchRemote, localVariables}) =>
    getAllEnvironmentVariables({
      root,
      fetchRemote,
      envBranch,
      envHandle,
      localVariables,
    }),
  );

  const [{watch}, {createFileWatchCache}] = await Promise.all([
    import('@remix-run/dev/dist/compiler/watch.js'),
    import('@remix-run/dev/dist/compiler/fileWatchCache.js'),
  ]).catch(handleRemixImportFail);

  let isInitialBuild = true;
  let initialBuildDurationMs = 0;
  let initialBuildStartTimeMs = Date.now();

  const liveReload = shouldLiveReload
    ? await setupLiveReload(remixConfig.dev?.port ?? 8002)
    : undefined;

  let miniOxygen: MiniOxygen;
  let codegenProcess: ChildProcess;
  async function safeStartMiniOxygen() {
    if (miniOxygen) return;

    const {allVariables, localVariables, logInjectedVariables} =
      await envPromise;

    miniOxygen = await startMiniOxygen(
      {
        root,
        debug,
        appPort,
        assetsPort,
        inspectorPort,
        watch: !liveReload,
        buildPathWorkerFile,
        buildPathClient,
        env: allVariables,
      },
      legacyRuntime,
    );

    logInjectedVariables();

    const host = (await tunnelPromise)?.host ?? miniOxygen.listeningAt;

    const cliCommand = await cliCommandPromise;
    enhanceH2Logs({host, cliCommand, ...remixConfig});

    const {storefrontTitle} = await backgroundPromise;

    miniOxygen.showBanner({
      appName: storefrontTitle,
      headlinePrefix:
        initialBuildDurationMs > 0
          ? `Initial build: ${initialBuildDurationMs}ms\n`
          : '',
      host,
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

    if (customerAccountPushFlag && isMockShop(localVariables)) {
      notifyIssueWithTunnelAndMockShop(cliCommand);
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
          await copyFilesPromise;
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
          const {fetchRemote} = await backgroundPromise;
          const {allVariables, logInjectedVariables} =
            await getAllEnvironmentVariables({
              root,
              fetchRemote,
              envBranch,
              envHandle,
            });

          logInjectedVariables();

          await miniOxygen.reload({
            env: allVariables,
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
    getUrl: () => miniOxygen.listeningAt,
    async close() {
      codegenProcess?.kill(0);
      await Promise.allSettled([
        closeWatcher(),
        miniOxygen?.close(),
        Promise.resolve(tunnelPromise).then((tunnel) => tunnel?.cleanup?.()),
      ]);
    },
  };
}
