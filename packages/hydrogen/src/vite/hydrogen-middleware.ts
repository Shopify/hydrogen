import type {ViteDevServer} from 'vite';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createReadStream} from 'node:fs';
import {
  clearHistory,
  emitRequestEvent,
  streamRequestEvents,
} from './request-events.js';
import type {HydrogenPluginOptions} from './types.js';

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
    function h2HandleGraphiQLCustomerSchema(_req, res) {
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
