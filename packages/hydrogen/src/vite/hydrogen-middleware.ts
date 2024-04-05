import {normalizePath, type ViteDevServer, type ResolvedConfig} from 'vite';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createReadStream} from 'node:fs';
import {
  clearHistory,
  emitRequestEvent,
  streamRequestEvents,
} from './request-events.js';
import type {RemixPluginContext} from '@remix-run/dev/dist/vite/plugin.js';
import {addVirtualRoutes} from './add-virtual-routes.js';
import type {HydrogenPluginOptions} from './types.js';

const H2_PREFIX_WARN = '[h2:warn:vite] ';

export type HydrogenMiddlewareOptions = HydrogenPluginOptions & {
  isOxygen?: boolean;
};

export function setupHydrogenMiddleware(
  viteDevServer: ViteDevServer,
  options: HydrogenMiddlewareOptions,
) {
  if (!options.isOxygen) {
    // If Oxygen is not present, we are probably running
    // on Node.js, so we can setup the global functions directly.
    globalThis.__H2O_LOG_EVENT = (data) => {
      emitRequestEvent(data, viteDevServer.config.root);
    };

    viteDevServer.middlewares.use(function (req, res, next) {
      // Filter out dev requests
      if (!/^\/__vite_/.test(req.url || '')) {
        // Hydrogen requires a unique request ID for each request
        // to track the request lifecycle. This is added by Oxygen
        // normally but we can add it here for development in Node.
        req.headers['request-id'] ??= crypto.randomUUID();

        const startTimeMs = Date.now();
        let endTimeMs = 0;

        res.once('pipe', () => {
          endTimeMs = Date.now();
        });

        res.once('close', () => {
          emitRequestEvent(
            {
              __fromVite: true,
              eventType: 'request',
              url: req.url!,
              requestId: req.headers['request-id'] as string,
              purpose: req.headers['purpose'] as string,
              startTime: startTimeMs,
              endTime: endTimeMs || Date.now(),
              responseInit: {
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: Object.entries(
                  res.getHeaders() as Record<string, string>,
                ),
              },
            },
            viteDevServer.config.root,
          );
        });
      }

      next();
    });
  }

  if (options.disableVirtualRoutes) return;

  addVirtualRoutesToRemix(viteDevServer);

  viteDevServer.middlewares.use(
    '/debug-network-server',
    function h2HandleSubrequestProfilerEvent(req, res) {
      // This request comes from Hydrogen's Subrequest Profiler UI.
      req.method === 'DELETE'
        ? clearHistory(req, res)
        : streamRequestEvents(req, res);
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
