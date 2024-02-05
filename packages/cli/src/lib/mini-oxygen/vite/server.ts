import {type HMRChannel, type HMRPayload, type ViteDevServer} from 'vite';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createFileReadStream} from '@shopify/cli-kit/node/fs';
import {createBirpc, type BirpcReturn} from 'birpc';
import {Miniflare} from 'miniflare';
import {WebSocket, WebSocketServer} from 'ws';
import type {ClientFunctions, ServerFunctions} from './common.js';
import {H2O_BINDING_NAME, createLogRequestEvent} from '../../request-events.js';
import {OXYGEN_HEADERS_MAP} from '../common.js';

import type {ViteEnv} from './client.js';
const clientPath = fileURLToPath(new URL('./client.js', import.meta.url));

const AsyncFunction = async function () {}.constructor as typeof Function;
const fnDeclarationLineCount = (() => {
  const body = '/*code*/';
  const source = new AsyncFunction('a', 'b', body).toString();
  return source.slice(0, source.indexOf(body)).split('\n').length - 1;
})();

const fetchModulePathname = '/__vite_fetch_module';

const oxygenHeadersMap = Object.values(OXYGEN_HEADERS_MAP).reduce(
  (acc, item) => {
    acc[item.name] = item.defaultValue;
    return acc;
  },
  {} as Record<string, string>,
);

type MiniOxygenViteOptions = {
  viteServer: ViteDevServer;
  viteUrl: URL;
  env?: Record<string, any>;
};

export async function startMiniOxygenVite({
  viteServer,
  viteUrl,
  env,
}: MiniOxygenViteOptions) {
  const workerEntryFile =
    typeof viteServer.config.build.ssr === 'string'
      ? viteServer.config.build.ssr
      : 'server.ts';

  const hmrPort = 9400;
  const wss = new WebSocketServer({host: 'localhost', port: hmrPort});
  const hmrChannel = new WssHmrChannel();

  const mf = new Miniflare({
    script: await readFile(clientPath, 'utf-8'),
    scriptPath: path.join(viteServer.config.root, '_virtual-server-entry.js'),
    modules: true,
    unsafeEvalBinding: '__VITE_UNSAFE_EVAL',
    compatibilityFlags: ['streams_enable_constructors'],
    compatibilityDate: '2022-10-31',
    bindings: {
      ...env,
      __VITE_ROOT: viteServer.config.root,
      __VITE_CODE_LINE_OFFSET: String(fnDeclarationLineCount),
      __VITE_URL: viteUrl.toString(),
      __VITE_RUNTIME_EXECUTE_URL: workerEntryFile,
      __VITE_FETCH_MODULE_URL: path.join(viteUrl.origin + fetchModulePathname),
      __VITE_HMR_URL: `http://localhost:${hmrPort}`,
    } satisfies Omit<ViteEnv, '__VITE_UNSAFE_EVAL'>,
    serviceBindings: {
      [H2O_BINDING_NAME]: createLogRequestEvent({
        absoluteBundlePath: '', // TODO
      }),
    },
    // handleRuntimeStdio(stdio, stderr) {},
  });

  mf.ready.then(() => {
    const serverFunctions: ServerFunctions = {
      hmrSend(_payload) {
        // TODO: emit?
      },
    };

    viteServer.hot.addChannel(hmrChannel);

    wss.on('connection', (ws) => {
      const rpc = createBirpc<ClientFunctions, ServerFunctions>(
        serverFunctions,
        {
          post: (data) => ws.send(data),
          on: (data) => ws.on('message', data),
          serialize: (v) => JSON.stringify(v),
          deserialize: (v) => JSON.parse(v),
        },
      );

      hmrChannel.clients.set(ws, rpc);

      ws.on('close', () => {
        hmrChannel.clients.delete(ws);
      });
    });
  });

  viteServer.middlewares.use(fetchModulePathname, async (req, res) => {
    const url = new URL(req.url!, 'http://localhost');

    const id = url.searchParams.get('id');
    const importer = url.searchParams.get('importer') ?? undefined;

    if (!id) {
      res.statusCode = 400;
      return res.end('Invalid request');
    }

    const ssrModule = await viteServer.ssrFetchModule(id, importer);
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify(ssrModule));
  });

  viteServer.middlewares.use(
    '/graphiql/customer-account.schema.json',
    async (req, res) => {
      const require = createRequire(import.meta.url);
      const filePath = require.resolve(
        '@shopify/hydrogen/customer-account.schema.json',
      );

      res.writeHead(200, {'Content-Type': 'application/json'});
      createFileReadStream(filePath).pipe(res);
    },
  );

  return {
    async handleRequest(request: globalThis.Request, ctx: {viteUrl: string}) {
      const mfURL = await mf.ready;
      const resolvedUrl = new URL(request.url);
      resolvedUrl.protocol = mfURL.protocol;
      resolvedUrl.host = mfURL.host;

      const body = request.body ? await request.arrayBuffer() : undefined;
      const response = await mf.dispatchFetch(resolvedUrl, {
        method: request.method,
        headers: {
          'request-id': crypto.randomUUID(),
          ...oxygenHeadersMap,
          ...Object.fromEntries(
            request.headers as unknown as Iterable<[string, string]>,
          ),
        },
        body,
      });

      return response as unknown as globalThis.Response;
    },
    async teardown() {
      await mf.dispose();
      await new Promise<void>((resolve, reject) =>
        wss.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

class WssHmrChannel implements HMRChannel {
  name = 'WssHmrChannel';
  clients = new Map<WebSocket, BirpcReturn<ClientFunctions, ServerFunctions>>();

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
    }

    this.clients.forEach((rpc) => {
      rpc.hmrSend(payload);
    });
  }
}
