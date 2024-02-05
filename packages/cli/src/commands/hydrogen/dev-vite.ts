import path from 'node:path';
import {statSync} from 'node:fs';
import {outputDebug, outputInfo} from '@shopify/cli-kit/node/output';
import {renderFatalError} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {enhanceH2Logs, muteDevLogs} from '../../lib/log.js';
import {
  commonFlags,
  flagsToCamelObject,
  overrideFlag,
} from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {buildAssetsUrl} from '../../lib/mini-oxygen/index.js';
import {startMiniOxygenVite} from '../../lib/mini-oxygen/vite/server.js';
import {addVirtualRoutes} from '../../lib/virtual-routes.js';
import {spawnCodegenProcess} from '../../lib/codegen.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getConfig} from '../../lib/shopify-config.js';
import {checkRemixVersions} from '../../lib/remix-version-check.js';
import {getGraphiQLUrl} from '../../lib/graphiql-url.js';
import {displayDevUpgradeNotice} from './upgrade.js';
import {findPort} from '../../lib/find-port.js';
import {prepareDiffDirectory} from '../../lib/template-diff.js';

import {createServer as createHattipServer} from '@hattip/adapter-node';
import httpProxy from 'http-proxy';
import {createServer as createViteServer} from 'vite';
import type {RemixPluginContext} from '@remix-run/dev/dist/vite/plugin.js';
import {
  handleDebugNetworkRequest,
  setConstructors,
} from '../../lib/request-events.js';

export default class DevVite extends Command {
  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    path: commonFlags.path,
    port: overrideFlag(commonFlags.port, {default: undefined, required: false}),
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
    host: Flags.boolean({
      description: 'Expose the server to the network',
      default: false,
      required: false,
    }),
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
  host?: boolean;
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
  host,
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

  const root = appPath ?? process.cwd();

  const envPromise = getConfig(root).then(({shop, storefront}) => {
    const fetchRemote = !!shop && !!storefront?.id;
    return getAllEnvironmentVariables({root, fetchRemote, envBranch});
  });

  const viteServer = await createViteServer({
    server: {host: host ? true : undefined},
  });

  process.once('SIGTERM', async () => {
    try {
      await viteServer.close();
    } finally {
      process.exit();
    }
  });

  const viteConfig = viteServer.config;
  const remixPluginContext = ((viteConfig as any)
    .__remixPluginContext as RemixPluginContext) || {
    rootDirectory: root,
    remixConfig: {appDirectory: path.join(root, 'app')},
  };

  // assertOxygenChecks(remixConfig);

  if (!disableVirtualRoutes) {
    // Unfreeze remixConfig to extend it with virtual routes.
    remixPluginContext.remixConfig = {...remixPluginContext.remixConfig};
    // @ts-expect-error
    remixPluginContext.remixConfig.routes = {
      ...remixPluginContext.remixConfig.routes,
    };

    await addVirtualRoutes(remixPluginContext.remixConfig).catch((error) => {
      // Seen this fail when somehow NPM doesn't publish
      // the full 'virtual-routes' directory.
      // E.g. https://unpkg.com/browse/@shopify/cli-hydrogen@0.0.0-next-aa15969-20230703072007/dist/virtual-routes/
      outputDebug(
        'Could not add virtual routes: ' +
          (error?.stack ?? error?.message ?? error),
      );
    });

    Object.freeze(remixPluginContext.remixConfig.routes);
    Object.freeze(remixPluginContext.remixConfig);
  }

  const {remixConfig, rootDirectory} = remixPluginContext;

  const codegenProcess = useCodegen
    ? spawnCodegenProcess({
        rootDirectory,
        appDirectory: remixConfig.appDirectory,
        configFilePath: codegenConfigPath,
      })
    : undefined;

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

  // handle unhandledRejection so that the process won't exit
  process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection: ', err);
  });

  // Store the port passed by the user in the config.
  const publicPort = 3000 ?? appPort ?? viteServer.config.server.port ?? 3000;
  // const assetsPort = await findPort(publicPort + 100);
  // if (assetsPort) {
  //   // Note: Set this env before loading Remix config!
  //   process.env.HYDROGEN_ASSET_BASE_URL = buildAssetsUrl(assetsPort);
  // }

  // Start the internal Vite server with a random port.
  await viteServer.listen(0);

  const viteUrlString =
    viteServer.resolvedUrls!.local[0] ?? viteServer.resolvedUrls!.network[0]!;
  const viteUrl = new URL(viteUrlString);

  const internalPort = viteUrl.origin.split(':').pop()?.replace('/', '')!;
  viteServer.config.server.port = Number(internalPort);

  inspectorPort = debug ? await findPort(inspectorPort) : inspectorPort;

  setConstructors({Response: globalThis.Response});

  const workerRuntime = await startMiniOxygenVite({
    debug,
    inspectorPort,
    env: await envPromise,
    viteUrl,
    viteServer,
  });

  const publicFacingServer = createHattipServer(async (ctx) => {
    const url = new URL(ctx.request.url);

    if (
      /^\/(@\w+|node_modules)\//.test(url.pathname) ||
      statSync(path.join(rootDirectory, url.pathname), {
        throwIfNoEntry: false,
      })?.isFile()
    ) {
      // This is a request for a static file or a virtual module:
      // forward it to Vite server.
      const newUrl = new URL(url);
      newUrl.protocol = viteUrl.protocol;
      newUrl.host = viteUrl.host;

      return fetch(new Request(newUrl.href, ctx.request)).catch((error) => {
        console.error('Failed to proxy request to Vite server:', error);
        return new Response(null, {status: 500});
      });
    }

    return workerRuntime
      .handleRequest(ctx.request, {viteUrl: viteUrlString})
      .catch((error) => {
        console.error('Error during evaluation:', error);
        return new Response(null, {status: 500});
      });
  });

  const viteProxyServer = httpProxy.createProxyServer({
    target: viteUrlString,
    ws: true,
  });

  publicFacingServer.on('upgrade', (req, socket, head) => {
    viteProxyServer.ws(req, socket, head);
  });

  // Start the public facing server with the port passed by the user.
  publicFacingServer.listen(publicPort, 'localhost', () => {
    enhanceH2Logs({rootDirectory, host: `http://localhost:${publicPort}`});

    if (viteServer.resolvedUrls) {
      if (internalPort) {
        // Replace the internal port with the public port in the resolved URLs
        // to print the correct URLs in the console.
        viteServer.resolvedUrls.local = viteServer.resolvedUrls.local.map(
          (url) => url.replace(internalPort, String(publicPort)),
        );
        viteServer.resolvedUrls.network = viteServer.resolvedUrls.network.map(
          (url) => url.replace(':' + internalPort, ':' + publicPort),
        );
      }
    }

    console.log('');
    viteServer.printUrls();
    viteServer.bindCLIShortcuts({print: true});

    checkRemixVersions();
    if (!disableVersionCheck) {
      displayDevUpgradeNotice({targetPath: appPath});
    }
  });

  return {
    async close() {
      codegenProcess?.kill(0);
      await workerRuntime.teardown();
      viteServer.close();
      viteProxyServer.close();
      publicFacingServer.close();
    },
  };
}
