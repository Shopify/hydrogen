import fs from 'node:fs/promises';
import { outputInfo, outputDebug } from '@shopify/cli-kit/node/output';
import { fileExists } from '@shopify/cli-kit/node/fs';
import { renderFatalError } from '@shopify/cli-kit/node/ui';
import { relativePath, resolvePath } from '@shopify/cli-kit/node/path';
import { copyPublicFiles } from './build.js';
import { getProjectPaths, assertOxygenChecks, handleRemixImportFail, getRemixConfig } from '../remix-config.js';
import { setH2OVerbose, isH2Verbose, muteDevLogs, createRemixLogger, enhanceH2Logs } from '../log.js';
import { DEFAULT_APP_PORT } from '../flags.js';
import { buildAssetsUrl, startMiniOxygen } from '../mini-oxygen/index.js';
import { addVirtualRoutes } from '../virtual-routes.js';
import { spawnCodegenProcess } from '../codegen.js';
import { getAllEnvironmentVariables } from '../environment-variables.js';
import { setupLiveReload } from '../live-reload.js';
import { checkRemixVersions } from '../remix-version-check.js';
import { displayDevUpgradeNotice } from '../../commands/hydrogen/upgrade.js';
import { findPort } from '../find-port.js';
import { getDevConfigInBackground, startTunnelAndPushConfig, isMockShop, notifyIssueWithTunnelAndMockShop } from '../dev-shared.js';
import { getCliCommand } from '../shell.js';

const LOG_REBUILDING = "\u{1F9F1} Rebuilding...";
const LOG_REBUILT = "\u{1F680} Rebuilt";
async function runClassicCompilerDev({
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
    process.env.HYDROGEN_ASSET_BASE_URL = await buildAssetsUrl(
      assetsPort,
      root
    );
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
  const remixWatchPath = require.resolve(
    "@remix-run/dev/dist/compiler/watch.js",
    { paths: [root] }
  );
  const remixFileWatchCachePath = require.resolve(
    "@remix-run/dev/dist/compiler/fileWatchCache.js",
    { paths: [root] }
  );
  const [{ watch }, { createFileWatchCache }] = await Promise.all([
    import(remixWatchPath),
    import(remixFileWatchCachePath)
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

export { runClassicCompilerDev };
