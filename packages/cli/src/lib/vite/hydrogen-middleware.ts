import {type ViteDevServer} from 'vite';
import {createRequire} from 'node:module';
import {createFileReadStream} from '@shopify/cli-kit/node/fs';
import {handleDebugNetworkRequest, setConstructors} from '../request-events.js';
import {SUBREQUEST_PROFILER_ENDPOINT} from '../mini-oxygen/common.js';
import {pipeFromWeb, toWeb} from './utils.js';

export function setupHydrogenMiddleware(viteDevServer: ViteDevServer) {
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
          res.end(JSON.stringify(result));
        });
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
