import {normalizePath, type ViteDevServer, type ResolvedConfig} from 'vite';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createReadStream} from 'node:fs';
import {
  clearHistory,
  setConstructors,
  streamRequestEvents,
  SUBREQUEST_PROFILER_ENDPOINT,
} from './request-events.js';
import type {RemixPluginContext} from '@remix-run/dev/dist/vite/plugin.js';
import {addVirtualRoutes} from './add-virtual-routes.js';
import type {HydrogenPluginOptions} from './types.js';

const H2_PREFIX_WARN = '[h2:warn:vite] ';

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
        headers: {'Content-Type': 'application/json'},
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

      let body = '';
      req.on('data', (chunk) => (body += chunk));

      req.on('end', () => {
        const args = body ? JSON.parse(body) : [];

        Promise.resolve(
          // @ts-expect-error Remix global magic
          globalThis['__remix_devServerHooks']?.getCriticalCss?.(...args),
        ).then((result?: string) => {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(result ?? ''));
        });
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
      req.method === 'DELETE' ? clearHistory() : streamRequestEvents(req, res);
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
      createReadStream(filePath).pipe(res);
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
    console.warn(
      H2_PREFIX_WARN +
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
