import { fileURLToPath } from 'node:url';
import { setH2OVerbose, isH2Verbose, muteDevLogs, enhanceH2Logs } from '../../lib/log.js';
import { commonFlags, overrideFlag, deprecated, flagsToCamelObject, DEFAULT_INSPECTOR_PORT, DEFAULT_APP_PORT } from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import { resolvePath, joinPath } from '@shopify/cli-kit/node/path';
import { collectLog } from '@shopify/cli-kit/node/output';
import { renderSuccess } from '@shopify/cli-kit/node/ui';
import { AbortError } from '@shopify/cli-kit/node/error';
import { Flags } from '@oclif/core';
import { spawnCodegenProcess } from '../../lib/codegen.js';
import { getAllEnvironmentVariables } from '../../lib/environment-variables.js';
import { displayDevUpgradeNotice } from './upgrade.js';
import { prepareDiffDirectory, copyShopifyConfig } from '../../lib/template-diff.js';
import { getDevConfigInBackground, TUNNEL_DOMAIN, startTunnelAndPushConfig, getUtilityBannerlines, getDebugBannerLine, isMockShop, notifyIssueWithTunnelAndMockShop } from '../../lib/dev-shared.js';
import { getCliCommand } from '../../lib/shell.js';
import { findPort } from '../../lib/find-port.js';
import { logRequestLine } from '../../lib/mini-oxygen/common.js';
import { hasViteConfig, findHydrogenPlugin, findOxygenPlugin } from '../../lib/vite-config.js';
import { runClassicCompilerDev } from '../../lib/classic-compiler/dev.js';
import { createRequire } from 'module';

const require2 = createRequire(import.meta.url);
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
    const { close } = await hasViteConfig(directory) ? await runDev(devParams) : await runClassicCompilerDev(devParams);
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
  entry: ssrEntry,
  port: appPort,
  path: appPath,
  host,
  codegen: useCodegen = false,
  codegenConfigPath,
  disableVirtualRoutes,
  envBranch,
  env: envHandle,
  debug = false,
  disableVersionCheck = false,
  inspectorPort,
  isLocalDev = false,
  customerAccountPush: customerAccountPushFlag = false,
  cliConfig,
  verbose
}) {
  if (!process.env.NODE_ENV)
    process.env.NODE_ENV = "development";
  if (verbose)
    setH2OVerbose();
  if (!isH2Verbose())
    muteDevLogs();
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
  const vitePath = require2.resolve("vite", { paths: [root] });
  const viewNodePath = joinPath(vitePath, "..", "dist", "node", "index.js");
  const vite = await import(viewNodePath);
  const fs = isLocalDev ? { allow: [root, fileURLToPath(new URL("../../../../", import.meta.url))] } : void 0;
  const customLogger = vite.createLogger();
  if (process.env.SHOPIFY_UNIT_TEST) {
    customLogger.info = (msg) => collectLog("info", msg);
    customLogger.warn = (msg) => collectLog("warn", msg);
    customLogger.error = (msg) => collectLog("error", msg);
  }
  const viteServer = await vite.createServer({
    root,
    customLogger,
    clearScreen: false,
    server: { fs, host: host ? true : void 0 },
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
            logRequestLine
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
  const codegenProcess = useCodegen ? spawnCodegenProcess({
    rootDirectory: root,
    configFilePath: codegenConfigPath,
    appDirectory: h2PluginOptions?.remixConfig?.appDirectory
  }) : void 0;
  process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejection: ", err);
  });
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
  const customSections = [];
  if (!h2PluginOptions?.disableVirtualRoutes) {
    customSections.push({ body: getUtilityBannerlines(finalHost) });
  }
  if (debug && inspectorPort) {
    customSections.push({
      body: { warn: getDebugBannerLine(inspectorPort) }
    });
  }
  const { storefrontTitle } = await backgroundPromise;
  renderSuccess({
    body: [
      `View ${storefrontTitle ? colors.cyan(storefrontTitle) : "Hydrogen"} app:`,
      { link: { url: finalHost } }
    ],
    customSections
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

export { Dev as default, runDev };
