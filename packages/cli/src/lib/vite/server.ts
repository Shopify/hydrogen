import {
  fetchModule,
  type HMRChannel,
  type HMRPayload,
  type ViteDevServer,
} from 'vite';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createFileReadStream} from '@shopify/cli-kit/node/fs';
import {Miniflare, NoOpLog, Request, type Response} from 'miniflare';
import {WebSocket, WebSocketServer} from 'ws';
import {
  H2O_BINDING_NAME,
  createLogRequestEvent,
  handleDebugNetworkRequest,
  setConstructors,
} from '../request-events.js';
import {
  OXYGEN_HEADERS_MAP,
  SUBREQUEST_PROFILER_ENDPOINT,
  logRequestLine,
} from '../mini-oxygen/common.js';
import {
  PRIVATE_WORKERD_INSPECTOR_PORT,
  OXYGEN_WORKERD_COMPAT_PARAMS,
} from '../mini-oxygen/workerd.js';
import {findPort} from '../find-port.js';
import {createInspectorConnector} from '../mini-oxygen/workerd-inspector.js';
import {MiniOxygenOptions} from '../mini-oxygen/types.js';
import {pipeFromWeb, toURL, toWeb} from './utils.js';

import type {ViteEnv} from './client.js';
const clientPath = fileURLToPath(new URL('./client.js', import.meta.url));

const PRIVATE_WORKERD_HMR_PORT = 9400;
const FETCH_MODULE_PATHNAME = '/__vite_fetch_module';
const WARMUP_PATHNAME = '/__vite_warmup';

const oxygenHeadersMap = Object.values(OXYGEN_HEADERS_MAP).reduce(
  (acc, item) => {
    acc[item.name] = item.defaultValue;
    return acc;
  },
  {} as Record<string, string>,
);

type MiniOxygenViteOptions = Pick<
  MiniOxygenOptions,
  'env' | 'debug' | 'inspectorPort'
> & {
  viteDevServer: ViteDevServer;
  workerEntryFile: string;
};

export type MiniOxygen = Awaited<ReturnType<typeof startMiniOxygenRuntime>>;

export async function startMiniOxygenRuntime({
  viteDevServer,
  env,
  debug = false,
  inspectorPort,
  workerEntryFile,
}: MiniOxygenViteOptions) {
  const scriptPromise = readFile(clientPath, 'utf-8');
  const [publicInspectorPort, privateInspectorPort, privateHmrPort] =
    await Promise.all([
      findPort(inspectorPort),
      findPort(PRIVATE_WORKERD_INSPECTOR_PORT),
      findPort(PRIVATE_WORKERD_HMR_PORT),
    ]);

  const mf = new Miniflare({
    cf: false,
    verbose: false,
    log: new NoOpLog(),
    name: 'hydrogen',
    inspectorPort: privateInspectorPort,
    modules: true,
    modulesRoot: viteDevServer.config.root,
    script: await scriptPromise,
    scriptPath: path.join(
      viteDevServer.config.root,
      '_virtual-server-entry.js',
    ),
    ...OXYGEN_WORKERD_COMPAT_PARAMS,
    bindings: {
      ...env,
      __VITE_ROOT: viteDevServer.config.root,
      __VITE_RUNTIME_EXECUTE_URL: workerEntryFile,
      __VITE_FETCH_MODULE_PATHNAME: FETCH_MODULE_PATHNAME,
      __VITE_HMR_URL: `http://localhost:${privateHmrPort}`,
      __VITE_WARMUP_PATHNAME: WARMUP_PATHNAME,
    } satisfies Omit<ViteEnv, '__VITE_UNSAFE_EVAL'>,
    unsafeEvalBinding: '__VITE_UNSAFE_EVAL',
    serviceBindings: {
      [H2O_BINDING_NAME]: createLogRequestEvent({
        absoluteBundlePath: '', // TODO
      }),
    },
    handleRuntimeStdio(stdout, stderr) {
      // TODO: handle runtime stdio and remove inspector logs
    },
  });

  const hmrChannel = new WssHmrChannel();
  const wss = new WebSocketServer({host: 'localhost', port: privateHmrPort});
  wss.on('connection', (ws) => {
    hmrChannel.clients.add(ws);
    ws.on('close', () => {
      hmrChannel.clients.delete(ws);
    });
  });

  viteDevServer.hot.addChannel(hmrChannel);

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
    dispatch: (webRequest: Request) => mf.dispatchFetch(webRequest),
    async dispose() {
      await mf.dispose();
      await new Promise<void>((resolve, reject) =>
        wss.close((err) => (err ? reject(err) : resolve())),
      );
    },
    publicInspectorPort,
  };
}

export function setupHydrogenHandlers(viteDevServer: ViteDevServer) {
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

export function setupOxygenHandlers(
  viteDevServer: ViteDevServer,
  dispatchFetch: (webRequest: Request) => Promise<Response>,
) {
  viteDevServer.middlewares.use(
    FETCH_MODULE_PATHNAME,
    function h2HandleModuleFetch(req, res) {
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
        fetchModule(viteDevServer, id, importer).then((ssrModule) => {
          res.end(JSON.stringify(ssrModule));
        });
      } else {
        res.statusCode = 400;
        res.end('Invalid request');
      }
    },
  );

  viteDevServer.middlewares.use(function h2HandleWorkerRequest(req, res) {
    // This request comes from the browser. At this point, Vite
    // tried to serve the request as a static file, but it didn't
    // find it in the project. Therefore, we assume this is a
    // request for a Remix route, and we forward it to workerd.

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

class WssHmrChannel implements HMRChannel {
  name = 'WssHmrChannel';
  clients = new Set<WebSocket>();

  listen(): void {}
  close(): void {}
  on(_event: unknown, _listener: unknown): void {}
  off(_event: string, _listener: Function): void {}

  send(arg0: unknown, arg1?: unknown): void {
    let payload: HMRPayload;
    if (typeof arg0 === 'string') {
      payload = {
        type: 'custom',
        event: arg0,
        data: arg1,
      };
    } else {
      payload = arg0 as HMRPayload;
      if (payload.type === 'update') {
        // TODO: handle partial updates
        payload = {type: 'full-reload', path: '*'};
      }
    }

    this.clients.forEach((ws) => {
      ws.send(JSON.stringify(payload));
    });
  }
}
