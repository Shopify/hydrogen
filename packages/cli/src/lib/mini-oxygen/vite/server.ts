import {type HMRChannel, type HMRPayload, type ViteDevServer} from 'vite';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createBirpc, type BirpcReturn} from 'birpc';
import {Miniflare} from 'miniflare';
import {WebSocket, WebSocketServer} from 'ws';
import type {ClientFunctions, ServerFunctions} from './common.js';

const clientPath = fileURLToPath(new URL('./client.js', import.meta.url));

const AsyncFunction = async function () {}.constructor as typeof Function;
const fnDeclarationLineCount = (() => {
  const body = '/*code*/';
  const source = new AsyncFunction('a', 'b', body).toString();
  return source.slice(0, source.indexOf(body)).split('\n').length - 1;
})();

const fetchModulePathname = '/__vite_fetch_module';

export async function startMiniOxygenVite(
  server: ViteDevServer,
  options?: {env?: Record<string, any>},
) {
  const clientContent = (await readFile(clientPath, 'utf-8'))
    .replaceAll('__ROOT__', JSON.stringify(server.config.root))
    .replaceAll('__CODE_LINE_OFFSET__', '' + fnDeclarationLineCount);

  const mf = new Miniflare({
    script: clientContent,
    scriptPath: path.join(server.config.root, '_virtual-server-entry.js'),
    modules: true,
    unsafeEvalBinding: 'UNSAFE_EVAL',
    compatibilityFlags: ['streams_enable_constructors'],
    compatibilityDate: '2022-10-31',
    bindings: {...options?.env},
    // handleRuntimeStdio(stdio, stderr) {},
  });

  const url = await mf.ready;
  const wss = new WebSocketServer({host: 'localhost', port: 9400});
  const hmrChannel = new WssHmrChannel();
  server.hot.addChannel(hmrChannel);

  server.middlewares.use(async (req, res) => {
    const url = new URL(req.url!, 'http://localhost');

    if (url.pathname === fetchModulePathname) {
      const id = url.searchParams.get('id');
      const importer = url.searchParams.get('importer') ?? undefined;

      if (!id) {
        res.statusCode = 400;
        return res.end('Invalid request');
      }

      const ssrModule = await server.ssrFetchModule(id, importer);
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(ssrModule));
    }
  });

  const serverFunctions: ServerFunctions = {
    hmrSend(_payload) {
      // TODO: emit?
    },
  };

  wss.on('connection', (ws) => {
    const rpc = createBirpc<ClientFunctions, ServerFunctions>(serverFunctions, {
      post: (data) => ws.send(data),
      on: (data) => ws.on('message', data),
      serialize: (v) => JSON.stringify(v),
      deserialize: (v) => JSON.parse(v),
    });

    hmrChannel.clients.set(ws, rpc);

    ws.on('close', () => {
      hmrChannel.clients.delete(ws);
    });
  });

  const workerEntryFile =
    typeof server.config.build.ssr === 'string'
      ? server.config.build.ssr
      : 'server.ts';

  return {
    async handleRequest(request: globalThis.Request, ctx: {viteUrl: string}) {
      const resolvedUrl = new URL(request.url);
      resolvedUrl.protocol = url.protocol;
      resolvedUrl.host = url.host;

      request.headers.set('vite-runtime-execute-url', workerEntryFile);
      request.headers.set(
        'vite-fetch-module-url',
        path.join(ctx.viteUrl + fetchModulePathname),
      );

      const body = request.body ? await request.arrayBuffer() : undefined;
      const response = await mf.dispatchFetch(resolvedUrl, {
        method: request.method,
        headers: Object.fromEntries(
          request.headers as unknown as Iterable<[string, string]>,
        ),
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
