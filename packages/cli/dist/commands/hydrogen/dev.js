import fs from 'node:fs/promises';
import { outputInfo, outputDebug } from '@shopify/cli-kit/node/output';
import { fileExists } from '@shopify/cli-kit/node/fs';
import { renderFatalError } from '@shopify/cli-kit/node/ui';
import { resolvePath, relativePath } from '@shopify/cli-kit/node/path';
import { copyPublicFiles } from './build.js';
import { getProjectPaths, assertOxygenChecks, handleRemixImportFail, getRemixConfig } from '../../lib/remix-config.js';
import { setH2OVerbose, isH2Verbose, muteDevLogs, createRemixLogger, enhanceH2Logs } from '../../lib/log.js';
import { commonFlags, deprecated, flagsToCamelObject, DEFAULT_APP_PORT } from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import { Flags } from '@oclif/core';
import { buildAssetsUrl, startMiniOxygen } from '../../lib/mini-oxygen/index.js';
import { addVirtualRoutes } from '../../lib/virtual-routes.js';
import { spawnCodegenProcess } from '../../lib/codegen.js';
import { getAllEnvironmentVariables } from '../../lib/environment-variables.js';
import { setupLiveReload } from '../../lib/live-reload.js';
import { checkRemixVersions } from '../../lib/remix-version-check.js';
import { displayDevUpgradeNotice } from './upgrade.js';
import { findPort } from '../../lib/find-port.js';
import { prepareDiffDirectory, copyShopifyConfig } from '../../lib/template-diff.js';
import { getDevConfigInBackground, startTunnelAndPushConfig, isMockShop, notifyIssueWithTunnelAndMockShop } from '../../lib/dev-shared.js';
import { getCliCommand } from '../../lib/shell.js';
import { hasViteConfig } from '../../lib/vite-config.js';
import { createRequire } from 'module';

const require2 = createRequire(import.meta.url);
const LOG_REBUILDING = "\u{1F9F1} Rebuilding...";
const LOG_REBUILT = "\u{1F680} Rebuilt";
class Dev extends Command {
  static descriptionWithMarkdown = `Runs a Hydrogen storefront in a local runtime that emulates an Oxygen worker for development.

  If your project is [linked](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-link) to a Hydrogen storefront, then its environment variables will be loaded with the runtime.`;
  static description = "Runs Hydrogen storefront in an Oxygen worker for development.";
  static flags = {
    ...commonFlags.path,
    ...commonFlags.port,
    worker: deprecated("--worker", { isBoolean: true }),
    ...commonFlags.legacyRuntime,
    ...commonFlags.codegen,
    ...commonFlags.sourcemap,
    "disable-virtual-routes": Flags.boolean({
      description: "Disable rendering fallback routes when a route file doesn't exist.",
      env: "SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES",
      default: false
    }),
    ...commonFlags.debug,
    ...commonFlags.inspectorPort,
    ...commonFlags.env,
    ...commonFlags.envBranch,
    "disable-version-check": Flags.boolean({
      description: "Skip the version check when running `hydrogen dev`",
      default: false,
      required: false
    }),
    ...commonFlags.diff,
    ...commonFlags.customerAccountPush,
    ...commonFlags.verbose
  };
  async run() {
    const { flags } = await this.parse(Dev);
    const originalDirectory = flags.path ? resolvePath(flags.path) : process.cwd();
    let directory = originalDirectory;
    if (flags.diff) {
      directory = await prepareDiffDirectory(directory, true);
    }
    const devParams = {
      ...flagsToCamelObject(flags),
      customerAccountPush: flags["customer-account-push__unstable"],
      path: directory,
      cliConfig: this.config
    };
    const { close } = await hasViteConfig(directory ?? process.cwd()) ? await import('./dev-vite.js').then(
      ({ runViteDev }) => runViteDev(devParams)
    ) : await runDev(devParams);
    let closingPromise;
    const processExit = process.exit;
    process.exit = async (code) => {
      closingPromise ??= close();
      await closingPromise;
      return processExit(code);
    };
    if (flags.diff) {
      await copyShopifyConfig(directory, originalDirectory);
    }
  }
}
async function runDev({
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
  verbose
}) {
  if (!process.env.NODE_ENV)
    process.env.NODE_ENV = "development";
  if (verbose)
    setH2OVerbose();
  if (!isH2Verbose())
    muteDevLogs();
  const { root, publicPath, buildPathClient, buildPathWorkerFile } = getProjectPaths(appPath);
  const copyFilesPromise = copyPublicFiles(publicPath, buildPathClient);
  const cliCommandPromise = getCliCommand(root);
  const reloadConfig = async () => {
    const config = await getRemixConfig(root);
    return disableVirtualRoutes ? config : addVirtualRoutes(config).catch((error) => {
      outputDebug(
        "Could not add virtual routes: " + (error?.stack ?? error?.message ?? error)
      );
      return config;
    });
  };
  const getFilePaths = (file) => {
    const fileRelative = relativePath(root, file);
    return [fileRelative, resolvePath(root, fileRelative)];
  };
  const serverBundleExists = () => fileExists(buildPathWorkerFile);
  if (!appPort) {
    appPort = await findPort(DEFAULT_APP_PORT);
  }
  const assetsPort = legacyRuntime ? 0 : await findPort(appPort + 100);
  if (assetsPort) {
    process.env.HYDROGEN_ASSET_BASE_URL = await buildAssetsUrl(assetsPort, root);
  }
  const backgroundPromise = getDevConfigInBackground(
    root,
    customerAccountPushFlag
  );
  const tunnelPromise = cliConfig && backgroundPromise.then(({ customerAccountPush, storefrontId }) => {
    if (customerAccountPush) {
      return startTunnelAndPushConfig(
        root,
        cliConfig,
        appPort,
        storefrontId
      );
    }
  });
  const remixConfig = await reloadConfig();
  assertOxygenChecks(remixConfig);
  const envPromise = backgroundPromise.then(
    ({ fetchRemote, localVariables }) => getAllEnvironmentVariables({
      root,
      fetchRemote,
      envBranch,
      envHandle,
      localVariables
    })
  );
  const remixRunWatch = require2.resolve("@remix-run/dev/dist/compiler/watch.js", { paths: [root] });
  const remixRunWatchPath = require2.resolve("@remix-run/dev/dist/compiler/fileWatchCache.js", { paths: [root] });
  const [{ watch }, { createFileWatchCache }] = await Promise.all([
    import(remixRunWatch),
    import(remixRunWatchPath)
  ]).catch(handleRemixImportFail);
  let isInitialBuild = true;
  let initialBuildDurationMs = 0;
  let initialBuildStartTimeMs = Date.now();
  const liveReload = shouldLiveReload ? await setupLiveReload(remixConfig.dev?.port ?? 8002, root) : void 0;
  let miniOxygen;
  let codegenProcess;
  async function safeStartMiniOxygen() {
    if (miniOxygen)
      return;
    const { allVariables, logInjectedVariables } = await envPromise;
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
        env: allVariables
      },
      legacyRuntime
    );
    logInjectedVariables();
    const host = (await tunnelPromise)?.host ?? miniOxygen.listeningAt;
    const cliCommand = await cliCommandPromise;
    enhanceH2Logs({ host, cliCommand, ...remixConfig });
    const { storefrontTitle } = await backgroundPromise;
    miniOxygen.showBanner({
      appName: storefrontTitle,
      headlinePrefix: initialBuildDurationMs > 0 ? `Initial build: ${initialBuildDurationMs}ms
` : "",
      host
    });
    if (useCodegen) {
      codegenProcess = spawnCodegenProcess({
        ...remixConfig,
        configFilePath: codegenConfigPath
      });
    }
    checkRemixVersions();
    if (!disableVersionCheck) {
      displayDevUpgradeNotice({ targetPath: appPath });
    }
    if (customerAccountPushFlag && isMockShop(allVariables)) {
      notifyIssueWithTunnelAndMockShop(cliCommand);
    }
  }
  const fileWatchCache = createFileWatchCache();
  let skipRebuildLogs = false;
  const closeWatcher = await watch(
    {
      config: remixConfig,
      options: {
        mode: process.env.NODE_ENV,
        sourcemap
      },
      fileWatchCache,
      logger: createRemixLogger()
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
          if (!miniOxygen)
            console.log("");
        }
        if (!miniOxygen && !await serverBundleExists()) {
          return renderFatalError({
            name: "BuildError",
            type: 0,
            message: "MiniOxygen cannot start because the server bundle has not been generated.",
            skipOclifErrorHandling: true,
            tryMessage: "This is likely due to an error in your app and Remix is unable to compile. Try fixing the app and MiniOxygen will start."
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
      async onFileCreated(file) {
        const [relative, absolute] = getFilePaths(file);
        outputInfo(`
\u{1F4C4} File created: ${relative}`);
        if (absolute.startsWith(publicPath)) {
          await copyPublicFiles(
            absolute,
            absolute.replace(publicPath, buildPathClient)
          );
        }
      },
      async onFileChanged(file) {
        fileWatchCache.invalidateFile(file);
        const [relative, absolute] = getFilePaths(file);
        outputInfo(`
\u{1F4C4} File changed: ${relative}`);
        if (relative.endsWith(".env")) {
          skipRebuildLogs = true;
          const { fetchRemote } = await backgroundPromise;
          const { allVariables, logInjectedVariables } = await getAllEnvironmentVariables({
            root,
            fetchRemote,
            envBranch,
            envHandle
          });
          logInjectedVariables();
          await miniOxygen.reload({
            env: allVariables
          });
        }
        if (absolute.startsWith(publicPath)) {
          await copyPublicFiles(
            absolute,
            absolute.replace(publicPath, buildPathClient)
          );
        }
      },
      async onFileDeleted(file) {
        fileWatchCache.invalidateFile(file);
        const [relative, absolute] = getFilePaths(file);
        outputInfo(`
\u{1F4C4} File deleted: ${relative}`);
        if (absolute.startsWith(publicPath)) {
          await fs.unlink(absolute.replace(publicPath, buildPathClient));
        }
      }
    }
  );
  return {
    getUrl: () => miniOxygen.listeningAt,
    async close() {
      codegenProcess?.removeAllListeners("close");
      codegenProcess?.kill("SIGINT");
      await Promise.allSettled([
        closeWatcher(),
        miniOxygen?.close(),
        Promise.resolve(tunnelPromise).then((tunnel) => tunnel?.cleanup?.())
      ]);
    }
  };
}

export { Dev as default, runDev };
