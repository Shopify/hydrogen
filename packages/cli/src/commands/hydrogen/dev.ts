import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {devSessionJsonOutputSchema} from '../../lib/dev-session/types.js';
import type {ViteDevServer} from 'vite';
import {Flags, Config} from '@oclif/core';
import Command from '../../lib/hydrogen-command.js';
import colors from '@shopify/cli-kit/node/colors';
import {joinPath, normalizePath, resolvePath} from '@shopify/cli-kit/node/path';
import {collectLog} from '@shopify/cli-kit/node/output';
import {
  type AlertCustomSection,
  renderSuccess,
  renderInfo,
  renderFatalError,
} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {removeFile} from '@shopify/cli-kit/node/fs';
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
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {displayDevUpgradeNotice} from './upgrade.js';
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
import {
  findHydrogenPlugin,
  findOxygenPlugin,
  getViteConfig,
  isViteProject,
  REMIX_COMPILER_ERROR_MESSAGE,
} from '../../lib/vite-config.js';
import {importVite} from '../../lib/import-utils.js';
import {createEntryPointErrorHandler} from '../../lib/deps-optimizer.js';
import {getCodeFormatOptions} from '../../lib/format-code.js';
import {
  createRequestLogger,
  runDevSession,
  type DevSession,
} from '../../lib/dev-session.js';
import {hydrogenPackagesPath} from '../../lib/build.js';

export default class Dev extends Command {
  static jsonOutputSchema: typeof devSessionJsonOutputSchema =
    devSessionJsonOutputSchema;

  static descriptionWithMarkdown = `Runs a Hydrogen storefront in a local runtime that emulates an Oxygen worker for development.

  If your project is [linked](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-link) to a Hydrogen storefront, then its environment variables will be loaded with the runtime.

  Session status and JSONL logs are stored in your project's \`.shopify/dev/\` directory. The instance JSON includes the PID, session ID, \`logFile\`, and \`details.urls\`. Status becomes \`running\` when the server is ready.

  Only one dev session can run for the same project, environment, environment branch, and environment file, even with a different port. Shutdown removes the instance and lock files and retains the log. The log resets on each run.

  Use \`--json\` to stream the same JSONL records to stdout. Readiness URLs appear in the \`Ready: ...\` message and \`details.urls\`. Diagnostics use stderr. Fatal errors write the standard JSON error envelope to stdout and exit nonzero; they are excluded from the session log. There is no final success result. JSON output does not disable prompts; use \`--no-input\` to disable interactivity.`;

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
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
    ...commonFlags.envFile,
    'disable-version-check': Flags.boolean({
      description: 'Skip the version check when running `hydrogen dev`',
      default: false,
      required: false,
    }),
    ...commonFlags.customerAccountPush,
    ...commonFlags.verbose,
    host: Flags.boolean({
      description: 'Expose the server to the local network',
      default: false,
      required: false,
    }),
    'disable-deps-optimizer': Flags.boolean({
      description:
        "Disable adding dependencies to Vite's `ssr.optimizeDeps.include` automatically",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_DEPS_OPTIMIZER',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Dev);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    const devParams = {
      ...flagsToCamelObject(flags),
      customerAccountPush: flags['customer-account-push'],
      path: directory,
      cliConfig: this.config,
    };

    const isVite = await isViteProject(directory);
    if (!isVite) {
      throw new AbortError(REMIX_COMPILER_ERROR_MESSAGE);
    }

    await runDevSession(
      {command: 'hydrogen dev', directory, ...flagsToCamelObject(flags)},
      (session) => runDev({...devParams, session}),
    );
  }
}

type DevOptions = {
  session?: DevSession;
  entry?: string;
  port?: number;
  path?: string;
  codegen?: boolean;
  host?: boolean;
  codegenConfigPath?: string;
  disableVirtualRoutes?: boolean;
  disableVersionCheck?: boolean;
  disableDepsOptimizer?: boolean;
  envBranch?: string;
  env?: string;
  debug?: boolean;
  sourcemap?: boolean;
  inspectorPort?: number;
  customerAccountPush?: boolean;
  cliConfig: Config;
  verbose?: boolean;
  envFile: string;
};

export async function runDev({
  session,
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
  envFile,
  cliConfig,
  verbose,
}: DevOptions) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

  if (verbose) setH2OVerbose();
  if (!isH2Verbose()) muteDevLogs({debounce: !session?.json});

  // Port 0 (OS-assigned) breaks tunnel-based dev: cloudflared and Vite
  // receive the same 0, but Vite resolves it internally to a concrete port
  // while cloudflared targets localhost:0. Resolve to a real port upfront.
  if (appPort === 0) {
    appPort = await findPort(DEFAULT_APP_PORT);
  }

  const root = appPath ?? process.cwd();

  const startupController = new AbortController();
  const startupSignal = session
    ? AbortSignal.any([session.signal, startupController.signal])
    : startupController.signal;
  const cliCommandPromise = getCliCommand(root);
  const backgroundPromise = getDevConfigInBackground(
    root,
    customerAccountPushFlag,
    envFile,
    startupSignal,
  );

  const envPromise = backgroundPromise.then(({fetchRemote, localVariables}) =>
    getAllEnvironmentVariables({
      root,
      envBranch,
      envHandle,
      fetchRemote,
      localVariables,
      envFile,
      signal: startupSignal,
    }),
  );
  const runtimeEnvPromise = envPromise.then(({allVariables}) => allVariables);
  // Startup can be cancelled before Vite consumes these background results.
  runtimeEnvPromise.catch(() => {});
  session?.cleanup(async () => {
    startupController.abort();
    await Promise.allSettled([
      backgroundPromise,
      cliCommandPromise,
      envPromise,
    ]);
  });

  if (debug && !inspectorPort) {
    // The Vite plugin can find and return a port for the inspector
    // but we need to print the URLs before the runtime is ready,
    // so we find a port early here.
    inspectorPort = await findPort(DEFAULT_INSPECTOR_PORT);
  }

  const vite = await importVite(root);

  if (hydrogenPackagesPath) {
    // Force reoptimizing deps without printing the message
    await removeFile(joinPath(root, 'node_modules/.vite'));
  }

  const formatOptionsPromise = Promise.resolve().then(() =>
    getCodeFormatOptions(root),
  );

  const viteServer = await vite.createServer({
    root,
    clearScreen: false,
    // In unit tests, node_modules is a symlink. Avoid writing .vite cache inside it.
    cacheDir: process.env.SHOPIFY_UNIT_TEST
      ? joinPath(root, '.vite')
      : undefined,
    customLogger: process.env.SHOPIFY_UNIT_TEST
      ? Object.assign(vite.createLogger(), {
          info: (msg: string) => collectLog('info', msg),
          warn: (msg: string) => collectLog('warn', msg),
          error: (msg: string) => collectLog('error', msg),
        })
      : undefined,
    server: {
      port: appPort ?? DEFAULT_APP_PORT,
      host: host ? true : undefined,
      // Allow Vite to read files from the Hydrogen packages in local development.
      fs: hydrogenPackagesPath
        ? {allow: [root, hydrogenPackagesPath]}
        : undefined,
    },
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
            envPromise: runtimeEnvPromise,
            inspectorPort,
            logRequestLine: createRequestLogger(session),
            entryPointErrorHandler: createEntryPointErrorHandler({
              disableDepsOptimizer,
              onError: (error) => {
                session?.log(error.stack ?? error.message, 'error');
                if (!session?.json) renderFatalError(error);
              },
              configFile: config.configFile,
              formatOptionsPromise,
              showSuccessBanner: () =>
                session?.json
                  ? session.log('Runtime recovered')
                  : showSuccessBanner({
                      disableVirtualRoutes,
                      debug,
                      inspectorPort,
                      finalHost,
                      localHost: tunnel?.host ? publicUrl.origin : undefined,
                      storefrontTitle,
                    }),
            }),
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

  session?.cleanup(() => viteServer.close());
  session?.signal.throwIfAborted();
  viteServer.watcher.on('change', (file) => {
    // Session writes must not trigger another log entry.
    if (!normalizePath(file).includes('/.shopify/dev/')) {
      session?.log(`File changed: ${file}`);
    }
  });
  viteServer.ws.on('error', (error) => session?.log(error.message, 'error'));

  const h2Plugin = findHydrogenPlugin(viteServer.config);
  if (!h2Plugin) {
    if (!session) await viteServer.close();
    throw new AbortError(
      'Hydrogen plugin not found.',
      'Add `hydrogen()` plugin to your Vite config.',
    );
  }

  const remixConfig = (await getViteConfig(root)).remixConfig;

  let codegenProcess: ReturnType<typeof spawnCodegenProcess> | undefined;
  const setupCodegen = useCodegen
    ? () => {
        codegenProcess?.kill(0);
        codegenProcess = spawnCodegenProcess({
          rootDirectory: root,
          configFilePath: codegenConfigPath,
          appDirectory: remixConfig?.appDirectory,
          onOutput: session?.json ? session.log : undefined,
        });
      }
    : undefined;

  session?.cleanup(() => {
    codegenProcess?.removeAllListeners('close');
    codegenProcess?.kill('SIGINT');
  });
  setupCodegen?.();

  if (hydrogenPackagesPath) {
    setupMonorepoReload(viteServer, hydrogenPackagesPath, setupCodegen);
  }

  // Store the port passed by the user in the config.
  const publicPort =
    appPort ?? viteServer.config.server.port ?? DEFAULT_APP_PORT;

  const startupTasks = [
    backgroundPromise.then(async ({customerAccountPush, storefrontId}) => {
      startupSignal.throwIfAborted();
      if (!customerAccountPush) return;
      const tunnel = await startTunnelAndPushConfig(
        root,
        cliConfig,
        publicPort,
        storefrontId,
        startupSignal,
      );
      session?.cleanup(() => tunnel.cleanup?.());
      return tunnel;
    }),
    cliCommandPromise,
    viteServer.listen(publicPort),
    envPromise,
  ] as const;
  const [tunnel, cliCommand] = await Promise.all(startupTasks).catch(
    async (error: unknown) => {
      startupController.abort();
      await Promise.allSettled(startupTasks);
      throw error;
    },
  );

  session?.signal.throwIfAborted();

  const publicUrl = new URL(
    viteServer.resolvedUrls!.local[0] ?? viteServer.resolvedUrls!.network[0]!,
  );

  const finalHost = tunnel?.host || publicUrl.toString() || publicUrl.origin;

  // Start the public facing server with the port passed by the user.
  if (!session?.json)
    enhanceH2Logs({
      rootDirectory: root,
      host: finalHost,
      cliCommand,
    });

  const {logInjectedVariables, allVariables} = await envPromise;

  await session?.ready([
    ...new Set([
      finalHost,
      ...(viteServer.resolvedUrls?.local ?? []),
      ...(viteServer.resolvedUrls?.network ?? []),
    ]),
  ]);

  logInjectedVariables();
  console.log('');
  if (!session?.json) {
    viteServer.printUrls();
    viteServer.bindCLIShortcuts({print: true});
  }
  console.log('\n');

  const storefrontTitle = (await backgroundPromise).storefrontTitle;

  if (!session?.json)
    showSuccessBanner({
      disableVirtualRoutes,
      debug,
      inspectorPort,
      finalHost,
      localHost: tunnel?.host ? publicUrl.origin : undefined,
      storefrontTitle,
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
      viteServer.watcher.close();
    },
  };
}

function showSuccessBanner({
  disableVirtualRoutes,
  debug,
  inspectorPort,
  finalHost,
  localHost,
  storefrontTitle,
}: Pick<DevOptions, 'disableVirtualRoutes' | 'debug' | 'inspectorPort'> & {
  finalHost: string;
  localHost?: string;
  storefrontTitle?: string;
}) {
  const customSections: AlertCustomSection[] = [];

  if (!disableVirtualRoutes) {
    customSections.push({body: getUtilityBannerlines(finalHost, localHost)});
  }

  if (debug && inspectorPort) {
    customSections.push({
      body: {warn: getDebugBannerLine(inspectorPort)},
    });
  }

  renderSuccess({
    body: [
      `View ${
        storefrontTitle ? colors.cyan(storefrontTitle) : 'Hydrogen'
      } app:`,
      {link: {url: finalHost}},
    ],
    customSections,
  });
}

function setupMonorepoReload(
  viteServer: ViteDevServer,
  monorepoPackagesPath: string,
  setupCodegen?: () => void,
) {
  // Note: app code is already tracked by Vite in monorepos
  // so there is no need to watch it and do manual work here.
  // We need to track, however, code that is not imported in
  // the app and manually reload things here.

  viteServer.httpServer?.once('listening', () => {
    // Watch the Hydrogen plugin for changes and restart Vite server.
    // Virtual routes are already tracked by Vite because they are in-app code.
    viteServer.watcher.add(
      monorepoPackagesPath + 'hydrogen/dist/vite/plugin.js',
    );

    // Any change in MiniOxygen will overwrite every file in `dist`.
    // We watch the plugin file for example and restart Vite server,
    // which also restarts the MiniOxygen worker.
    // The only exception is worker-entry because it follows a separate
    // build in TSUP.
    viteServer.watcher.add(
      monorepoPackagesPath + 'mini-oxygen/dist/vite/plugin.js',
    );
    viteServer.watcher.add(
      monorepoPackagesPath + 'mini-oxygen/dist/vite/worker-entry.js',
    );

    // Watch any file in hydrogen-codegen to restart the codegen process.
    viteServer.watcher.add(
      monorepoPackagesPath + 'hydrogen-codegen/dist/esm/index.js',
    );

    let renderInfoTimeout: NodeJS.Timeout;
    viteServer.watcher.on('change', async (file) => {
      if (file.includes(monorepoPackagesPath)) {
        if (file.includes('/packages/hydrogen-codegen/')) {
          if (setupCodegen) {
            setupCodegen();
            renderInfo({
              headline: 'The Hydrogen Codegen source has been modified.',
              body: 'The codegen process has been restarted.',
            });
          }
        } else {
          // Restart Vite server, which also restarts MiniOxygen
          await viteServer.restart(true);

          clearTimeout(renderInfoTimeout);
          renderInfoTimeout = setTimeout(() => {
            console.log('');
            renderInfo({
              headline: 'The H2O Vite plugins have been modified.',
              body: 'The Vite server has been restarted to reflect the changes.',
            });
          }, 100);
        }
      }
    });
  });
}
