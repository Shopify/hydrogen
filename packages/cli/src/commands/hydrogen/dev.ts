import {fileURLToPath} from 'node:url';
import {
  enhanceH2Logs,
  isH2Verbose,
  muteDevLogs,
  setH2OVerbose,
} from '../../lib/log.js';
import {
  DEFAULT_APP_PORT,
  DEFAULT_INSPECTOR_PORT,
  commonFlags,
  deprecated,
  flagsToCamelObject,
  overrideFlag,
} from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {collectLog} from '@shopify/cli-kit/node/output';
import {type AlertCustomSection, renderSuccess} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {Flags, Config} from '@oclif/core';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {displayDevUpgradeNotice} from './upgrade.js';
import {
  prepareDiffDirectory,
  copyShopifyConfig,
} from '../../lib/template-diff.js';
import {
  getDebugBannerLine,
  startTunnelAndPushConfig,
  isMockShop,
  notifyIssueWithTunnelAndMockShop,
  getDevConfigInBackground,
  getUtilityBannerlines,
  TUNNEL_DOMAIN,
} from '../../lib/dev-shared.js';
import {getCliCommand} from '../../lib/shell.js';
import {findPort} from '../../lib/find-port.js';
import {logRequestLine} from '../../lib/mini-oxygen/common.js';
import {findHydrogenPlugin, findOxygenPlugin} from '../../lib/vite-config.js';
import {hasViteConfig} from '../../lib/vite-config.js';
import {runClassicCompilerDev} from '../../lib/classic-compiler/dev.js';
import {joinPath} from '@shopify/cli-kit/node/path';
import {createRequire} from 'module'

const require = createRequire(import.meta.url)

export default class Dev extends Command {
  static descriptionWithMarkdown = `Runs a Hydrogen storefront in a local runtime that emulates an Oxygen worker for development.

  If your project is [linked](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-link) to a Hydrogen storefront, then its environment variables will be loaded with the runtime.`;

  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.entry,
    ...overrideFlag(commonFlags.port, {
      port: {default: undefined, required: false},
    }),
    ...commonFlags.codegen,
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
    host: Flags.boolean({
      description: 'Expose the server to the local network',
      default: false,
      required: false,
    }),

    // For the classic compiler:
    worker: deprecated('--worker', {isBoolean: true}),
    ...overrideFlag(commonFlags.legacyRuntime, {
      'legacy-runtime': {
        description:
          '[Classic Remix Compiler] ' +
          commonFlags.legacyRuntime['legacy-runtime'].description,
      },
    }),
    ...overrideFlag(commonFlags.sourcemap, {
      sourcemap: {
        description:
          '[Classic Remix Compiler] ' +
          commonFlags.sourcemap.sourcemap.description,
      },
    }),
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

    const {close} = (await hasViteConfig(directory))
      ? await runDev(devParams)
      : await runClassicCompilerDev(devParams);

    // Note: Shopify CLI is hooking into process events and calling process.exit.
    // This means we are unable to hook into 'beforeExit' or 'SIGINT" events
    // to cleanup resources. In addition, Miniflare uses `exit-hook` dependency
    // to do the same thing. This is a workaround to ensure we cleanup resources:
    let closingPromise: Promise<void>;
    const processExit = process.exit;
    // @ts-expect-error - Async function
    process.exit = async (code?: number | undefined) => {
      // This function will be called multiple times,
      // but we only want to cleanup resources once.
      closingPromise ??= close();
      await closingPromise;
      return processExit(code);
    };

    if (flags.diff) {
      await copyShopifyConfig(directory, originalDirectory);
    }
  }
}

type DevOptions = {
  entry?: string;
  port?: number;
  path?: string;
  codegen?: boolean;
  host?: boolean;
  codegenConfigPath?: string;
  disableVirtualRoutes?: boolean;
  disableVersionCheck?: boolean;
  envBranch?: string;
  env?: string;
  debug?: boolean;
  sourcemap?: boolean;
  inspectorPort?: number;
  isLocalDev?: boolean;
  customerAccountPush?: boolean;
  cliConfig: Config;
  verbose?: boolean;
};

export async function runDev({
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
  verbose,
}: DevOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  if (verbose) setH2OVerbose();
  if (!isH2Verbose()) muteDevLogs();

  const root = appPath ?? process.cwd();

  const cliCommandPromise = getCliCommand(root);
  const backgroundPromise = getDevConfigInBackground(
    root,
    customerAccountPushFlag,
  );

  const envPromise = backgroundPromise.then(({fetchRemote, localVariables}) =>
    getAllEnvironmentVariables({
      root,
      envBranch,
      envHandle,
      fetchRemote,
      localVariables,
    }),
  );

  if (debug && !inspectorPort) {
    // The Vite plugin can find and return a port for the inspector
    // but we need to print the URLs before the runtime is ready,
    // so we find a port early here.
    inspectorPort = await findPort(DEFAULT_INSPECTOR_PORT);
  }

  const vitePath = require.resolve('vite', {paths: [root]});
  const newPath = joinPath(vitePath, '..', 'dist', 'node', 'index.js')
  type Vite = typeof import('vite');
  const vite: Vite = await import(newPath);

  // Allow Vite to read files from the Hydrogen packages in local development.
  const fs = isLocalDev
    ? {allow: [root, fileURLToPath(new URL('../../../../', import.meta.url))]}
    : undefined;

  const customLogger = vite.createLogger();
  if (process.env.SHOPIFY_UNIT_TEST) {
    // Make logs from Vite visible in tests
    customLogger.info = (msg) => collectLog('info', msg);
    customLogger.warn = (msg) => collectLog('warn', msg);
    customLogger.error = (msg) => collectLog('error', msg);
  }

  const viteServer = await vite.createServer({
    root,
    customLogger,
    clearScreen: false,
    server: {fs, host: host ? true : undefined},
    plugins: [
      {
        name: 'hydrogen:cli',
        configResolved(config) {
          findHydrogenPlugin(config)?.api?.registerPluginOptions({
            disableVirtualRoutes,
          });

          findOxygenPlugin(config)?.api?.registerPluginOptions({
            debug,
            entry: ssrEntry,
            envPromise: envPromise.then(({allVariables}) => allVariables),
            inspectorPort,
            logRequestLine,
          });
        },
        configureServer: (viteDevServer) => {
          if (customerAccountPushFlag) {
            viteDevServer.middlewares.use((req, res, next) => {
              const host = req.headers.host;

              if (host?.includes(TUNNEL_DOMAIN.ORIGINAL)) {
                req.headers.host = host.replace(
                  TUNNEL_DOMAIN.ORIGINAL,
                  TUNNEL_DOMAIN.REBRANDED,
                );
              }

              next();
            });
          }
        },
      },
    ],
  });

  const h2Plugin = findHydrogenPlugin(viteServer.config);
  if (!h2Plugin) {
    await viteServer.close();
    throw new AbortError(
      'Hydrogen plugin not found.',
      'Add `hydrogen()` plugin to your Vite config.',
    );
  }

  const h2PluginOptions = h2Plugin.api?.getPluginOptions?.();

  const codegenProcess = useCodegen
    ? spawnCodegenProcess({
        rootDirectory: root,
        configFilePath: codegenConfigPath,
        appDirectory: h2PluginOptions?.remixConfig?.appDirectory,
      })
    : undefined;

  // handle unhandledRejection so that the process won't exit
  process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection: ', err);
  });

  // Store the port passed by the user in the config.
  const publicPort =
    appPort ?? viteServer.config.server.port ?? DEFAULT_APP_PORT;

  // TODO -- Need to change Remix' <Scripts/> component
  // const assetsPort = await findPort(publicPort + 100);
  // if (assetsPort) {
  //   // Note: Set this env before loading Remix config!
  //   process.env.HYDROGEN_ASSET_BASE_URL = buildAssetsUrl(assetsPort);
  // }

  const [tunnel, cliCommand] = await Promise.all([
    backgroundPromise.then(({customerAccountPush, storefrontId}) =>
      customerAccountPush
        ? startTunnelAndPushConfig(root, cliConfig, publicPort, storefrontId)
        : undefined,
    ),
    cliCommandPromise,
    viteServer.listen(publicPort),
  ]);

  const publicUrl = new URL(
    viteServer.resolvedUrls!.local[0] ?? viteServer.resolvedUrls!.network[0]!,
  );

  const finalHost = tunnel?.host || publicUrl.toString() || publicUrl.origin;

  // Start the public facing server with the port passed by the user.
  enhanceH2Logs({
    rootDirectory: root,
    host: finalHost,
    cliCommand,
  });

  const {logInjectedVariables, allVariables} = await envPromise;

  logInjectedVariables();
  console.log('');
  viteServer.printUrls();
  viteServer.bindCLIShortcuts({print: true});
  console.log('\n');

  const customSections: AlertCustomSection[] = [];

  if (!h2PluginOptions?.disableVirtualRoutes) {
    customSections.push({body: getUtilityBannerlines(finalHost)});
  }

  if (debug && inspectorPort) {
    customSections.push({
      body: {warn: getDebugBannerLine(inspectorPort)},
    });
  }

  const {storefrontTitle} = await backgroundPromise;
  renderSuccess({
    body: [
      `View ${
        storefrontTitle ? colors.cyan(storefrontTitle) : 'Hydrogen'
      } app:`,
      {link: {url: finalHost}},
    ],
    customSections,
  });

  if (!disableVersionCheck) {
    displayDevUpgradeNotice({targetPath: root});
  }

  if (customerAccountPushFlag && isMockShop(allVariables)) {
    notifyIssueWithTunnelAndMockShop(cliCommand);
  }

  return {
    getUrl: () => finalHost,
    async close() {
      codegenProcess?.removeAllListeners('close');
      codegenProcess?.kill('SIGINT');
      await Promise.allSettled([viteServer.close(), tunnel?.cleanup?.()]);
    },
  };
}
