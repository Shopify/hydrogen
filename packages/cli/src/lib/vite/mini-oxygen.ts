import {fetchModule, type ViteDevServer} from 'vite';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {Miniflare, NoOpLog, Request, type Response} from 'miniflare';
import {OXYGEN_HEADERS_MAP, logRequestLine} from '../mini-oxygen/common.js';
import {
  PRIVATE_WORKERD_INSPECTOR_PORT,
  OXYGEN_WORKERD_COMPAT_PARAMS,
} from '../mini-oxygen/workerd.js';
import {findPort} from '../find-port.js';
import {createInspectorConnector} from '../mini-oxygen/workerd-inspector.js';
import {MiniOxygenOptions} from '../mini-oxygen/types.js';
import {getHmrUrl, pipeFromWeb, toURL, toWeb} from './utils.js';

import type {ViteEnv} from './worker-entry.js';
const scriptPath = fileURLToPath(new URL('./worker-entry.js', import.meta.url));

const FETCH_MODULE_PATHNAME = '/__vite_fetch_module';
const WARMUP_PATHNAME = '/__vite_warmup';

const oxygenHeadersMap = Object.values(OXYGEN_HEADERS_MAP).reduce(
  (acc, item) => {
    acc[item.name] = item.defaultValue;
    return acc;
  },
  {} as Record<string, string>,
);

export type InternalMiniOxygenOptions = {
  setupScripts?: Array<(viteUrl: string) => void>;
  services?: Record<string, (request: Request) => Response | Promise<Response>>;
};

type MiniOxygenViteOptions = InternalMiniOxygenOptions &
  Pick<MiniOxygenOptions, 'env' | 'debug' | 'inspectorPort'> & {
    viteDevServer: ViteDevServer;
    workerEntryFile: string;
  };

export type MiniOxygen = Awaited<ReturnType<typeof startMiniOxygenRuntime>>;

export async function startMiniOxygenRuntime({
  viteDevServer,
  env,
  services,
  debug = false,
  inspectorPort,
  workerEntryFile,
  setupScripts,
}: MiniOxygenViteOptions) {
  const [publicInspectorPort, privateInspectorPort] = await Promise.all([
    findPort(inspectorPort),
    findPort(PRIVATE_WORKERD_INSPECTOR_PORT),
  ]);

  const mf = new Miniflare({
    cf: false,
    verbose: false,
    log: new NoOpLog(),
    inspectorPort: privateInspectorPort,
    handleRuntimeStdio(stdout, stderr) {
      // TODO: handle runtime stdio and remove inspector logs
    },
    workers: [
      {
        name: 'oxygen',
        modulesRoot: '/',
        modules: [{type: 'ESModule', path: scriptPath}],
        ...OXYGEN_WORKERD_COMPAT_PARAMS,
        serviceBindings: {...services},
        bindings: {
          ...env,
          __VITE_ROOT: viteDevServer.config.root,
          __VITE_RUNTIME_EXECUTE_URL: workerEntryFile,
          __VITE_FETCH_MODULE_PATHNAME: FETCH_MODULE_PATHNAME,
          __VITE_HMR_URL: getHmrUrl(viteDevServer),
          __VITE_WARMUP_PATHNAME: WARMUP_PATHNAME,
        } satisfies Omit<ViteEnv, '__VITE_UNSAFE_EVAL' | '__VITE_SETUP_ENV'>,
        unsafeEvalBinding: '__VITE_UNSAFE_EVAL',
        wrappedBindings: {
          __VITE_SETUP_ENV: 'setup-environment',
        },
      },
      {
        name: 'setup-environment',
        modules: true,
        scriptPath,
        script: `
          const setupScripts = [${setupScripts ?? ''}];
          export default (env) => (request) => {
            const viteUrl = new URL(request.url).origin;
            setupScripts.forEach((setup) => setup?.(viteUrl));
            setupScripts.length = 0;
          }`,
      },
    ],
  });

  const warmupWorkerdCache = () => {
    let viteUrl =
      viteDevServer.resolvedUrls?.local[0] ??
      viteDevServer.resolvedUrls?.network[0];

    if (!viteUrl) {
      const address = viteDevServer.httpServer?.address?.();
      viteUrl =
        address && typeof address !== 'string'
          ? `http://localhost:${address.port}`
          : address ?? undefined;
    }

    if (viteUrl) {
      mf.dispatchFetch(new URL(WARMUP_PATHNAME, viteUrl)).catch(() => {});
    }
  };

  viteDevServer.httpServer?.listening
    ? warmupWorkerdCache()
    : viteDevServer.httpServer?.once('listening', warmupWorkerdCache);

  mf.ready.then(() => {
    const reconnect = createInspectorConnector({
      debug,
      sourceMapPath: '',
      absoluteBundlePath: '',
      privateInspectorPort,
      publicInspectorPort,
    });

    return reconnect();
  });

  return {
    ready: mf.ready,
    publicInspectorPort,
    dispatch: (webRequest: Request) => mf.dispatchFetch(webRequest),
    async dispose() {
      await mf.dispose();
    },
  };
}

export function setupOxygenMiddleware(
  viteDevServer: ViteDevServer,
  dispatchFetch: (webRequest: Request) => Promise<Response>,
) {
  viteDevServer.middlewares.use(
    FETCH_MODULE_PATHNAME,
    function o2HandleModuleFetch(req, res) {
      // This request comes from workerd. It is asking for the contents
      // of backend files. We need to fetch the file through Vite,
      // which transpiles/prepares the source code into valid JS, and
      // send it back so that workerd can evaluate/run it.

      const url = toURL(req);
      const id = url.searchParams.get('id');
      const importer = url.searchParams.get('importer') ?? undefined;

      if (id) {
        res.setHeader('cache-control', 'no-store');
        res.setHeader('content-type', 'application/json');

        // `fetchModule` is similar to `viteDevServer.ssrFetchModule`,
        // but it treats source maps differently (avoids adding empty lines).
        fetchModule(viteDevServer, id, importer)
          .then((ssrModule) => res.end(JSON.stringify(ssrModule)))
          .catch((error) => {
            console.error('Error during module fetch:', error);
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Internal server error');
          });
      } else {
        res.statusCode = 400;
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end('Invalid request');
      }
    },
  );

  viteDevServer.middlewares.use(function o2HandleWorkerRequest(req, res) {
    // This request comes from the browser. At this point, Vite
    // tried to serve the request as a static file, but it didn't
    // find it in the project. Therefore, we assume this is a
    // request for a backend route, and we forward it to workerd.

    if (!req.headers.host) throw new Error('Missing host header');

    const webRequest = toWeb(req, {
      'request-id': crypto.randomUUID(),
      ...oxygenHeadersMap,
    });

    const startTimeMs = Date.now();

    dispatchFetch(webRequest)
      .then((webResponse) => {
        pipeFromWeb(webResponse, res);

        logRequestLine(webRequest, {
          responseStatus: webResponse.status,
          durationMs: Date.now() - startTimeMs,
        });
      })
      .catch((error) => {
        console.error('Error during evaluation:', error);
        res.writeHead(500);
        res.end();
      });
  });
}
