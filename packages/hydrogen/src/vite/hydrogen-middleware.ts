import type {ViteDevServer} from 'vite';
import {createRequire} from 'node:module';
import {createReadStream} from 'node:fs';
import {clearHistory, streamRequestEvents} from './request-events.js';
import type {HydrogenPluginOptions} from './types.js';

export function setupHydrogenMiddleware(
  viteDevServer: ViteDevServer,
  options: HydrogenPluginOptions,
) {
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
