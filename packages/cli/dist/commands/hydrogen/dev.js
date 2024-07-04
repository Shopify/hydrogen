import { Flags } from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import { resolvePath, joinPath } from '@shopify/cli-kit/node/path';
import { collectLog } from '@shopify/cli-kit/node/output';
import { renderSuccess, renderInfo } from '@shopify/cli-kit/node/ui';
import { AbortError } from '@shopify/cli-kit/node/error';
import { removeFile } from '@shopify/cli-kit/node/fs';
import { setH2OVerbose, isH2Verbose, muteDevLogs, enhanceH2Logs } from '../../lib/log.js';
import { commonFlags, overrideFlag, deprecated, flagsToCamelObject, DEFAULT_INSPECTOR_PORT, DEFAULT_APP_PORT } from '../../lib/flags.js';
import { spawnCodegenProcess } from '../../lib/codegen.js';
import { getAllEnvironmentVariables } from '../../lib/environment-variables.js';
import { displayDevUpgradeNotice } from './upgrade.js';
import { prepareDiffDirectory } from '../../lib/template-diff.js';
import { getDevConfigInBackground, TUNNEL_DOMAIN, startTunnelAndPushConfig, isMockShop, notifyIssueWithTunnelAndMockShop, getUtilityBannerlines, getDebugBannerLine } from '../../lib/dev-shared.js';
import { getCliCommand } from '../../lib/shell.js';
import { findPort } from '../../lib/find-port.js';
import { logRequestLine } from '../../lib/mini-oxygen/common.js';
import { hasViteConfig, findHydrogenPlugin, findOxygenPlugin } from '../../lib/vite-config.js';
import { runClassicCompilerDev } from '../../lib/classic-compiler/dev.js';
import { importVite } from '../../lib/import-utils.js';
import { createEntryPointErrorHandler } from '../../lib/deps-optimizer.js';
import { getCodeFormatOptions } from '../../lib/format-code.js';
import { setupResourceCleanup } from '../../lib/resource-cleanup.js';
import { hydrogenPackagesPath } from '../../lib/build.js';

class Dev extends Command {
  static descriptionWithMarkdown = `Runs a Hydrogen storefront in a local runtime that emulates an Oxygen worker for development.

  If your project is [linked](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-link) to a Hydrogen storefront, then its environment variables will be loaded with the runtime.`;
  static description = "Runs Hydrogen storefront in an Oxygen worker for development.";
  static flags = {
    ...commonFlags.path,
    ...commonFlags.entry,
    ...overrideFlag(commonFlags.port, {
      port: { default: void 0, required: false }
    }),
    ...commonFlags.codegen,
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
    ...commonFlags.verbose,
    host: Flags.boolean({
      description: "Expose the server to the local network",
      default: false,
      required: false
    }),
    "disable-deps-optimizer": Flags.boolean({
      description: "Disable adding dependencies to Vite's `ssr.optimizeDeps.include` automatically",
      env: "SHOPIFY_HYDROGEN_FLAG_DISABLE_DEPS_OPTIMIZER",
      default: false
    }),
    // For the classic compiler:
    worker: deprecated("--worker", { isBoolean: true }),
    ...overrideFlag(commonFlags.legacyRuntime, {
      "legacy-runtime": {
        description: "[Classic Remix Compiler] " + commonFlags.legacyRuntime["legacy-runtime"].description
      }
    }),
    ...overrideFlag(commonFlags.sourcemap, {
      sourcemap: {
        description: "[Classic Remix Compiler] " + commonFlags.sourcemap.sourcemap.description
      }
    })
  };
  async run() {
    const { flags } = await this.parse(Dev);
    const originalDirectory = flags.path ? resolvePath(flags.path) : process.cwd();
    const diff = flags.diff ? await prepareDiffDirectory(originalDirectory, true) : void 0;
    const directory = diff?.targetDirectory ?? originalDirectory;
    const devParams = {
      ...flagsToCamelObject(flags),
      customerAccountPush: flags["customer-account-push__unstable"],
      path: directory,
      cliConfig: this.config
    };
    const { close } = await hasViteConfig(directory) ? await runDev(devParams) : await runClassicCompilerDev(devParams);
    setupResourceCleanup(async () => {
      await close();
      if (diff) {
        await diff.copyShopifyConfig();
        await diff.cleanup();
      }
    });
  }
}
async function runDev({
  entry: ssrEntry,
  port: appPort,
  path: appPath,
  host,
  codegen: useCodegen = false,
  codegenConfigPath,
  disableVirtualRoutes,
  disableDepsOptimizer = false,
  envBranch,
  env: envHandle,
  debug = false,
  disableVersionCheck = false,
  inspectorPort,
  customerAccountPush: customerAccountPushFlag = false,
  cliConfig,
  verbose
}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";
  if (verbose) setH2OVerbose();
  if (!isH2Verbose()) muteDevLogs();
  const root = appPath ?? process.cwd();
  const cliCommandPromise = getCliCommand(root);
  const backgroundPromise = getDevConfigInBackground(
    root,
    customerAccountPushFlag
  );
  const envPromise = backgroundPromise.then(
    ({ fetchRemote, localVariables }) => getAllEnvironmentVariables({
      root,
      envBranch,
      envHandle,
      fetchRemote,
      localVariables
    })
  );
  if (debug && !inspectorPort) {
    inspectorPort = await findPort(DEFAULT_INSPECTOR_PORT);
  }
  const vite = await importVite(root);
  if (hydrogenPackagesPath) {
    await removeFile(joinPath(root, "node_modules/.vite"));
  }
  const customLogger = vite.createLogger();
  if (process.env.SHOPIFY_UNIT_TEST) {
    customLogger.info = (msg) => collectLog("info", msg);
    customLogger.warn = (msg) => collectLog("warn", msg);
    customLogger.error = (msg) => collectLog("error", msg);
  }
  const formatOptionsPromise = Promise.resolve().then(
    () => getCodeFormatOptions(root)
  );
  const viteServer = await vite.createServer({
    root,
    customLogger,
    clearScreen: false,
    server: {
      host: host ? true : void 0,
      // Allow Vite to read files from the Hydrogen packages in local development.
      fs: hydrogenPackagesPath ? { allow: [root, hydrogenPackagesPath] } : void 0
    },
    plugins: [
      {
        name: "hydrogen:cli",
        configResolved(config) {
          findHydrogenPlugin(config)?.api?.registerPluginOptions({
            disableVirtualRoutes
          });
          findOxygenPlugin(config)?.api?.registerPluginOptions({
            debug,
            entry: ssrEntry,
            envPromise: envPromise.then(({ allVariables: allVariables2 }) => allVariables2),
            inspectorPort,
            logRequestLine,
            entryPointErrorHandler: createEntryPointErrorHandler({
              disableDepsOptimizer,
              configFile: config.configFile,
              formatOptionsPromise,
              showSuccessBanner: () => showSuccessBanner({
                disableVirtualRoutes,
                debug,
                inspectorPort,
                finalHost,
                storefrontTitle
              })
            })
          });
        },
        configureServer: (viteDevServer) => {
          if (customerAccountPushFlag) {
            viteDevServer.middlewares.use((req, res, next) => {
              const host2 = req.headers.host;
              if (host2?.includes(TUNNEL_DOMAIN.ORIGINAL)) {
                req.headers.host = host2.replace(
                  TUNNEL_DOMAIN.ORIGINAL,
                  TUNNEL_DOMAIN.REBRANDED
                );
              }
              next();
            });
          }
        }
      }
    ]
  });
  const h2Plugin = findHydrogenPlugin(viteServer.config);
  if (!h2Plugin) {
    await viteServer.close();
    throw new AbortError(
      "Hydrogen plugin not found.",
      "Add `hydrogen()` plugin to your Vite config."
    );
  }
  const h2PluginOptions = h2Plugin.api?.getPluginOptions?.();
  let codegenProcess;
  const setupCodegen = useCodegen ? () => {
    codegenProcess?.kill(0);
    codegenProcess = spawnCodegenProcess({
      rootDirectory: root,
      configFilePath: codegenConfigPath,
      appDirectory: h2PluginOptions?.remixConfig?.appDirectory
    });
  } : void 0;
  setupCodegen?.();
  if (hydrogenPackagesPath) {
    setupMonorepoReload(viteServer, hydrogenPackagesPath, setupCodegen);
  }
  const publicPort = appPort ?? viteServer.config.server.port ?? DEFAULT_APP_PORT;
  const [tunnel, cliCommand] = await Promise.all([
    backgroundPromise.then(
      ({ customerAccountPush, storefrontId }) => customerAccountPush ? startTunnelAndPushConfig(root, cliConfig, publicPort, storefrontId) : void 0
    ),
    cliCommandPromise,
    viteServer.listen(publicPort)
  ]);
  const publicUrl = new URL(
    viteServer.resolvedUrls.local[0] ?? viteServer.resolvedUrls.network[0]
  );
  const finalHost = tunnel?.host || publicUrl.toString() || publicUrl.origin;
  enhanceH2Logs({
    rootDirectory: root,
    host: finalHost,
    cliCommand
  });
  const { logInjectedVariables, allVariables } = await envPromise;
  logInjectedVariables();
  console.log("");
  viteServer.printUrls();
  viteServer.bindCLIShortcuts({ print: true });
  console.log("\n");
  const storefrontTitle = (await backgroundPromise).storefrontTitle;
  showSuccessBanner({
    disableVirtualRoutes,
    debug,
    inspectorPort,
    finalHost,
    storefrontTitle
  });
  if (!disableVersionCheck) {
    displayDevUpgradeNotice({ targetPath: root });
  }
  if (customerAccountPushFlag && isMockShop(allVariables)) {
    notifyIssueWithTunnelAndMockShop(cliCommand);
  }
  return {
    getUrl: () => finalHost,
    async close() {
      codegenProcess?.removeAllListeners("close");
      codegenProcess?.kill("SIGINT");
      await Promise.allSettled([viteServer.close(), tunnel?.cleanup?.()]);
    }
  };
}
function showSuccessBanner({
  disableVirtualRoutes,
  debug,
  inspectorPort,
  finalHost,
  storefrontTitle
}) {
  const customSections = [];
  if (!disableVirtualRoutes) {
    customSections.push({ body: getUtilityBannerlines(finalHost) });
  }
  if (debug && inspectorPort) {
    customSections.push({
      body: { warn: getDebugBannerLine(inspectorPort) }
    });
  }
  renderSuccess({
    body: [
      `View ${storefrontTitle ? colors.cyan(storefrontTitle) : "Hydrogen"} app:`,
      { link: { url: finalHost } }
    ],
    customSections
  });
}
function setupMonorepoReload(viteServer, monorepoPackagesPath, setupCodegen) {
  viteServer.httpServer?.once("listening", () => {
    viteServer.watcher.add(
      monorepoPackagesPath + "hydrogen/dist/vite/plugin.js"
    );
    viteServer.watcher.add(
      monorepoPackagesPath + "mini-oxygen/dist/vite/plugin.js"
    );
    viteServer.watcher.add(
      monorepoPackagesPath + "mini-oxygen/dist/vite/worker-entry.js"
    );
    viteServer.watcher.add(
      monorepoPackagesPath + "hydrogen-codegen/dist/esm/index.js"
    );
    viteServer.watcher.on("change", async (file) => {
      if (file.includes(monorepoPackagesPath)) {
        if (file.includes("/packages/hydrogen-codegen/")) {
          if (setupCodegen) {
            setupCodegen();
            renderInfo({
              headline: "The Hydrogen Codegen source has been modified.",
              body: "The codegen process has been restarted."
            });
          }
        } else {
          await viteServer.restart(true);
          console.log("");
          renderInfo({
            headline: "The H2O Vite plugins have been modified.",
            body: "The Vite server has been restarted to reflect the changes."
          });
        }
      }
    });
  });
}

export { Dev as default, runDev };
