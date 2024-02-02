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
import {setupRuntime} from '../../lib/mini-oxygen/vite/server.js';
import {addVirtualRoutes} from '../../lib/virtual-routes.js';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {setupLiveReload} from '../../lib/live-reload.js';
import {checkRemixVersions} from '../../lib/remix-version-check.js';
import {getGraphiQLUrl} from '../../lib/graphiql-url.js';
import {displayDevUpgradeNotice} from './upgrade.js';
import {findPort} from '../../lib/find-port.js';
import {prepareDiffDirectory} from '../../lib/template-diff.js';

import {createServer as createHattipServer} from '@hattip/adapter-node';
import httpProxy from 'http-proxy';
import {createServer} from 'vite';

const LOG_REBUILDING = '🧱 Rebuilding...';
const LOG_REBUILT = '🚀 Rebuilt';

export default class DevVite extends Command {
  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    path: commonFlags.path,
    port: commonFlags.port,
    codegen: overrideFlag(commonFlags.codegen, {
      description:
        commonFlags.codegen.description! +
        ' It updates the types on file save.',
    }),
    'codegen-config-path': commonFlags.codegenConfigPath,
    // sourcemap: commonFlags.sourcemap,
    'disable-virtual-routes': Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist.",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
    debug: commonFlags.debug,
    'inspector-port': commonFlags.inspectorPort,
    ['env-branch']: commonFlags.envBranch,
    ['disable-version-check']: Flags.boolean({
      description: 'Skip the version check when running `hydrogen dev`',
      default: false,
      required: false,
    }),
    diff: commonFlags.diff,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(DevVite);
    let directory = flags.path ? path.resolve(flags.path) : process.cwd();

    if (flags.diff) {
      directory = await prepareDiffDirectory(directory, true);
    }

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

  // const copyingFiles = copyPublicFiles(publicPath, buildPathClient);
  // const reloadConfig = async () => {
  //   const config = await getRemixConfig(root);

  //   return disableVirtualRoutes
  //     ? config
  //     : addVirtualRoutes(config).catch((error) => {
  //         // Seen this fail when somehow NPM doesn't publish
  //         // the full 'virtual-routes' directory.
  //         // E.g. https://unpkg.com/browse/@shopify/cli-hydrogen@0.0.0-next-aa15969-20230703072007/dist/virtual-routes/
  //         outputDebug(
  //           'Could not add virtual routes: ' +
  //             (error?.stack ?? error?.message ?? error),
  //         );

  //         return config;
  //       });
  // };

  inspectorPort = debug ? await findPort(inspectorPort) : inspectorPort;
  appPort = await findPort(appPort); // findPort is already called for Node sandbox

  const assetsPort = await findPort(appPort + 100);
  if (assetsPort) {
    // Note: Set this env before loading Remix config!
    process.env.HYDROGEN_ASSET_BASE_URL = buildAssetsUrl(assetsPort);
  }

  const [{shop, storefront}] = await Promise.all([getConfig(root)]);

  // assertOxygenChecks(remixConfig);

  const fetchRemote = !!shop && !!storefront?.id;
  const envPromise = getAllEnvironmentVariables({root, fetchRemote, envBranch});

  // let isInitialBuild = true;
  // let initialBuildDurationMs = 0;
  // let initialBuildStartTimeMs = Date.now();

  // const liveReload = true // TODO: option to disable HMR?
  //   ? await setupLiveReload(remixConfig.dev?.port ?? 8002)
  //   : undefined;

  // let miniOxygen: MiniOxygen;
  // let codegenProcess: ChildProcess;
  // async function safeStartMiniOxygen() {
  //   if (miniOxygen) return;

  //   miniOxygen = await startMiniOxygen({
  //     root,
  //     debug,
  //     assetsPort,
  //     inspectorPort,
  //     port: appPort,
  //     watch: !liveReload,
  //     buildPathWorkerFile,
  //     buildPathClient,
  //     env: await envPromise,
  //   });

  //   enhanceH2Logs({host: miniOxygen.listeningAt, ...remixConfig});

  //   miniOxygen.showBanner({
  //     appName: storefront ? colors.cyan(storefront?.title) : undefined,
  //     headlinePrefix:
  //       initialBuildDurationMs > 0
  //         ? `Initial build: ${initialBuildDurationMs}ms\n`
  //         : '',
  //     extraLines: [
  //       colors.dim(
  //         `\nView GraphiQL API browser: ${getGraphiQLUrl({
  //           host: miniOxygen.listeningAt,
  //         })}`,
  //       ),
  //       colors.dim(
  //         `\nView server network requests: ${miniOxygen.listeningAt}/subrequest-profiler`,
  //       ),
  //     ],
  //   });

  //   if (useCodegen) {
  //     codegenProcess = spawnCodegenProcess({
  //       ...remixConfig,
  //       configFilePath: codegenConfigPath,
  //     });
  //   }

  //   checkRemixVersions();

  //   if (!disableVersionCheck) {
  //     displayDevUpgradeNotice({targetPath: appPath});
  //   }
  // }

  const viteServer = await createServer();
  const publicPort = viteServer.config.server.port ?? 3000;

  process.once('SIGTERM', async () => {
    try {
      await viteServer.close();
    } finally {
      process.exit();
    }
  });

  const standaloneRuntime = await setupRuntime(viteServer, {
    env: await envPromise,
  });

  // handle unhandledRejection so that the process won't exit
  process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection: ', err);
  });

  // Get a random port
  await viteServer.listen(0);

  const viteUrlString =
    viteServer.resolvedUrls!.local[0] ?? viteServer.resolvedUrls!.network[0]!;
  const viteUrl = new URL(viteUrlString);
  const internalPort = viteUrlString.split(':').pop()?.replace('/', '')!;
  viteServer.config.server.port = Number(internalPort);

  const proxyServer = httpProxy.createProxyServer({
    target: viteUrlString,
    ws: true,
  });

  const hattipServer = createHattipServer(async (ctx) => {
    try {
      const resolved = await standaloneRuntime.selectModule(
        ctx.request,
        viteServer.config.root,
      );

      if (resolved === undefined) {
        // NOTE: If Vite uses Universal/Modern middlewares in the future,
        //       we can avoid using actual HTTP requests.
        //       It's difficult to convert Node middlewares into them.
        //       https://github.com/fastly/http-compute-js#notes--known-issues
        const newUrl = new URL(ctx.request.url);
        newUrl.protocol = viteUrl.protocol;
        newUrl.host = viteUrl.host;
        try {
          return await fetch(new Request(newUrl.href, ctx.request));
        } catch (e) {
          console.error('Failed to proxy request to Vite server: ', e);
          return new Response(null, {status: 500});
        }
      }

      const res = await standaloneRuntime.runModule(resolved, ctx.request, {
        viteUrl: viteUrlString,
      });
      return res;
    } catch (e) {
      console.error('Error during evaluation: ', e);
      return new Response(null, {status: 500});
    }
  });

  hattipServer.on('upgrade', (req, socket, head) => {
    proxyServer.ws(req, socket, head);
  });

  hattipServer.listen(publicPort, 'localhost', () => {
    if (viteServer.resolvedUrls) {
      if (internalPort) {
        viteServer.resolvedUrls.local = viteServer.resolvedUrls.local.map(
          (url) => url.replace(internalPort, String(publicPort)),
        );
        viteServer.resolvedUrls.network = viteServer.resolvedUrls.network.map(
          (url) => url.replace(':' + internalPort, ':' + publicPort),
        );
      }
    }
    viteServer.printUrls();
    viteServer.bindCLIShortcuts({print: true});
  });

  return {
    async close() {
      // codegenProcess?.kill(0);
      // await Promise.all([closeWatcher(), miniOxygen?.close()]);
    },
  };
}
