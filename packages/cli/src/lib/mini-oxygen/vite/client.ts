import {
  ViteRuntime,
  type ViteModuleRunner,
  type ViteRuntimeModuleContext,
  ssrModuleExportsKey,
  ssrImportMetaKey,
  ssrImportKey,
  ssrExportAllKey,
  ssrDynamicImportKey,
  type ResolvedResult,
  type SSRImportMetadata,
  type HMRRuntimeConnection,
} from 'vite/runtime';
import {createBirpc, type BirpcReturn} from 'birpc';
import type {ClientFunctions, ServerFunctions} from './common.js';
import type {Response} from 'miniflare';
import type {HMRPayload} from 'vite';
import {makeLegalIdentifier} from '@rollup/pluginutils';

export interface ViteEnv {
  __VITE_ROOT: string;
  __VITE_CODE_LINE_OFFSET: string;
  __VITE_URL: string;
  __VITE_HMR_URL: string;
  __VITE_FETCH_MODULE_URL: string;
  __VITE_RUNTIME_EXECUTE_URL: string;
  __VITE_UNSAFE_EVAL: UnsafeEval;
}

export default {
  async fetch(request: Request, env: ViteEnv, ctx: any) {
    await setupEnvironment(env);

    if (request.url.endsWith('.json')) {
      return fetch(new URL(new URL(request.url).pathname, env.__VITE_URL));
    }

    const module = await runtime.executeEntrypoint(
      env.__VITE_RUNTIME_EXECUTE_URL,
    );

    const appEnv = Object.keys(env).reduce((acc, key) => {
      if (!key.startsWith('__VITE_')) {
        acc[key] = env[key as keyof typeof env];
      }

      return acc;
    }, {} as Record<string, any>);

    return module.default.fetch(request, appEnv, ctx);
  },
};

let runner: MiniOxygenRunner;
let runtime: ViteRuntime;
let hmrRpc: BirpcReturn<ServerFunctions, ClientFunctions>;
let onHmrRecieve: ((payload: HMRPayload) => void) | undefined;

async function setupEnvironment(env: ViteEnv) {
  if (!runner || !runtime) {
    runner = new MiniOxygenRunner();
    runtime = new ViteRuntime(
      {
        root: env.__VITE_ROOT,
        fetchModule: (id, importer) => {
          // Do not use WS here because the payload can exceed the limit of WS in workerd

          const url = new URL(env.__VITE_FETCH_MODULE_URL);
          url.searchParams.set('id', id);
          if (importer) url.searchParams.set('importer', importer);

          return fetch(url).then((res) => res.json());
        },
        hmr: {
          connection: {
            isReady() {
              return !!hmrRpc;
            },
            send(messages: string) {
              // TODO
            },
            onUpdate(h: any) {
              onHmrRecieve = h;
              return () => {
                onHmrRecieve = undefined;
              };
            },
          } satisfies HMRRuntimeConnection,
        },
      },
      runner,
    );
  }

  if (!hmrRpc) {
    const wsClient = await connectHmrWsClient(env);

    hmrRpc = createBirpc<ServerFunctions, ClientFunctions>(
      {
        hmrSend(payload) {
          onHmrRecieve?.(payload);
        },
      },
      {
        post: (data) => wsClient.send(data),
        on: (data) => wsClient.addEventListener('message', (e) => data(e.data)),
        serialize: (v) => JSON.stringify(v),
        deserialize: (v) => JSON.parse(v),
      },
    );
  }

  runner.unsafeEval = env.__VITE_UNSAFE_EVAL;
  runner.codeLineOffset = Number(env.__VITE_CODE_LINE_OFFSET);
}

type UnsafeEval = {
  newAsyncFunction(code: string, name?: string, ...args: string[]): Function;
};

class MiniOxygenRunner implements ViteModuleRunner {
  unsafeEval: UnsafeEval | undefined;
  codeLineOffset = 0;

  private idMap = new Map<string, string[]>();

  async runViteModule(
    context: ViteRuntimeModuleContext,
    code: string,
    id: string,
  ): Promise<any> {
    if (!this.unsafeEval) throw new Error('unsafeEval module is not set');

    const escapedId = makeLegalIdentifier(id);

    if (!this.idMap.has(escapedId)) {
      this.idMap.set(escapedId, []);
    }
    const idList = this.idMap.get(escapedId)!;
    let number = idList.indexOf(id);
    if (number < 0) {
      number = idList.push(id) - 1;
    }

    delete context[ssrImportMetaKey].filename;
    delete context[ssrImportMetaKey].dirname;

    const initModule = this.unsafeEval.newAsyncFunction(
      '"use strict";' + '\n'.repeat(this.codeLineOffset) + code,
      `${escapedId}_${number}`,
      ssrModuleExportsKey,
      ssrImportMetaKey,
      ssrImportKey,
      ssrDynamicImportKey,
      ssrExportAllKey,
    );
    await initModule(
      context[ssrModuleExportsKey],
      context[ssrImportMetaKey],
      context[ssrImportKey],
      context[ssrDynamicImportKey],
      context[ssrExportAllKey],
    );
    Object.freeze(context[ssrModuleExportsKey]);
  }

  runExternalModule(_filepath: string): Promise<any> {
    // TODO: support Node.js modules
    // https://developers.cloudflare.com/workers/runtime-apis/nodejs/
    // TODO: support `cloudflare:*` modules and `workerd:*` modules
    throw new Error('Not supported');
  }

  processImport(
    mod: Record<string, any>,
    _fetchResult: ResolvedResult,
    _metadata?: SSRImportMetadata | undefined,
  ): Record<string, any> {
    return mod;
  }

  getGetRealFilenameFromEscapedId(escapedIdWithSuffix: string) {
    const match = escapedIdWithSuffix.match(/^(.+)_(\d+)$/);
    if (!match) return undefined;

    const escapedId = match[1] ?? '';
    const number = Number(match[2]);

    return this.idMap.get(escapedId)?.[number];
  }
}

async function connectHmrWsClient(env: ViteEnv) {
  const response = (await fetch(env.__VITE_HMR_URL, {
    headers: {Upgrade: 'websocket'},
  })) as unknown as Response;

  const ws = response.webSocket;
  if (!ws) throw new Error('ws failed to connect');

  ws.accept();

  return ws;
}

// Fix sourcemaps
const originalPrepareStackTrace = Error.prepareStackTrace!;
Error.prepareStackTrace = (error, stacks) => {
  const wrappedStacks = stacks.map(
    (stack) =>
      new Proxy(stack as any, {
        get(target, key, receiver) {
          const value = target[key];
          if (value instanceof Function) {
            return function (this: any, ...args: any[]) {
              const result = value.apply(
                this === receiver ? target : this,
                args,
              );
              if (key === 'getFileName' && typeof result === 'string') {
                const realFilename =
                  runner.getGetRealFilenameFromEscapedId(result);
                return realFilename ?? result;
              }
              return result;
            };
          }
          return value;
        },
      }),
  );

  return originalPrepareStackTrace(error, wrappedStacks);
};
