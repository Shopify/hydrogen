import {normalizePath, type ViteDevServer, type ResolvedConfig} from 'vite';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createFileReadStream} from '@shopify/cli-kit/node/fs';
import {handleDebugNetworkRequest, setConstructors} from '../request-events.js';
import {SUBREQUEST_PROFILER_ENDPOINT} from '../mini-oxygen/common.js';
import {pipeFromWeb, toWeb} from './utils.js';
import type {RemixPluginContext} from '@remix-run/dev/dist/vite/plugin.js';
import {addVirtualRoutes} from '../virtual-routes.js';
import type {HydrogenPluginOptions} from './shared.js';

// Function to be passed as a setup function to the Oxygen worker.
// It runs within workerd and sets up Remix dev server hooks.
// It is eventually stringified to be initialized in the worker,
// so do not use any external variables or imports.
export function setupRemixDevServerHooks(viteUrl: string) {
  // @ts-expect-error Remix global magic
  globalThis['__remix_devServerHooks'] = {
    getCriticalCss: (...args: any) =>
      fetch(new URL('/__vite_critical_css', viteUrl), {
        method: 'POST',
        body: JSON.stringify(args),
      }).then((res) => res.json()),
  };
}

export function setupHydrogenMiddleware(
  viteDevServer: ViteDevServer,
  options: HydrogenPluginOptions,
) {
  viteDevServer.middlewares.use(
    '/__vite_critical_css',
    function h2HandleCriticalCss(req, res) {
      // This request comes from Remix's `getCriticalCss` function
      // to gather the required CSS and avoid flashes of unstyled content in dev.

      toWeb(req)
        .json()
        .then(async (args: any) => {
          // @ts-expect-error Remix global magic
          const result = await globalThis[
            '__remix_devServerHooks'
          ]?.getCriticalCss?.(...args);
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(result ?? ''));
        });
    },
  );

  if (options.disableVirtualRoutes) return;

  addVirtualRoutesToRemix(viteDevServer);
  setConstructors({Response: globalThis.Response});

  viteDevServer.middlewares.use(
    SUBREQUEST_PROFILER_ENDPOINT,
    function h2HandleSubrequestProfilerEvent(req, res) {
      // This request comes from Hydrogen's Subrequest Profiler UI.

      const webResponse = handleDebugNetworkRequest(toWeb(req));
      pipeFromWeb(webResponse, res);
    },
  );

  viteDevServer.middlewares.use(
    '/graphiql/customer-account.schema.json',
    function h2HandleGraphiQLCustomerSchema(req, res) {
      // This request comes from Hydrogen's GraphiQL.
      // Currently, the CAAPI schema is not available in the public API,
      // so we serve it from here.

      const require = createRequire(import.meta.url);
      const filePath = require.resolve(
        '@shopify/hydrogen/customer-account.schema.json',
      );

      res.writeHead(200, {'Content-Type': 'application/json'});
      createFileReadStream(filePath).pipe(res);
    },
  );
}

// TODO: Sync with Remix team and find an official way to add virtual routes.
let virtualRoutesAdded = false;
async function addVirtualRoutesToRemix(viteDevServer: ViteDevServer) {
  if (virtualRoutesAdded) return;

  const appDirectory = await reloadRemixVirtualRoutes(viteDevServer.config);

  viteDevServer.watcher.on('all', (eventName, filepath) => {
    const appFileAddedOrRemoved =
      (eventName === 'add' || eventName === 'unlink') &&
      normalizePath(filepath).startsWith(normalizePath(appDirectory));

    const viteConfigChanged =
      eventName === 'change' &&
      normalizePath(filepath) ===
        normalizePath(viteDevServer.config.configFile ?? '');

    if (appFileAddedOrRemoved || viteConfigChanged) {
      setTimeout(() => reloadRemixVirtualRoutes(viteDevServer.config), 100);
    }
  });

  virtualRoutesAdded = true;
}

async function reloadRemixVirtualRoutes(config: ResolvedConfig) {
  const remixPluginContext = (config as any)
    .__remixPluginContext as RemixPluginContext;

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
    console.debug(
      'Could not add virtual routes: ' +
        (error?.stack ?? error?.message ?? error),
    );
  });

  Object.freeze(remixPluginContext.remixConfig.routes);
  Object.freeze(remixPluginContext.remixConfig);

  return (
    remixPluginContext?.remixConfig?.appDirectory ??
    path.join(config.root, 'app')
  );
}
