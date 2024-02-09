/**
 * All the code in this file is executed in workerd. This file
 * is compiled at build time (tsup) to be transpiled to JS, and
 * then loaded as string in a workerd instance at runtime as
 * the worker entrypoint. It then requests modules to Vite
 * and evaluates them to run the app's backend code.
 */

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
import type {Response} from 'miniflare';
import type {HMRPayload} from 'vite';
import {makeLegalIdentifier} from '@rollup/pluginutils';

export interface ViteEnv {
  __VITE_ROOT: string;
  __VITE_CODE_LINE_OFFSET: string;
  __VITE_HMR_URL: string;
  __VITE_FETCH_MODULE_PATHNAME: string;
  __VITE_RUNTIME_EXECUTE_URL: string;
  __VITE_UNSAFE_EVAL: UnsafeEval;
  __VITE_WARMUP_PATHNAME: string;
}

export default {
  async fetch(request: Request, env: ViteEnv, ctx: any) {
    const url = new URL(request.url);

    // Fetch the app's entry module and cache it. E.g. `<root>/server.ts`
    const module = await fetchEntryModule(url, env);

    // Return early for warmup requests after loading the entry module.
    if (url.pathname === env.__VITE_WARMUP_PATHNAME) {
      return new globalThis.Response(null);
    }

    // Clean up variables that are only used for dev orchestration.
    const appEnv = (Object.keys(env) as Array<keyof typeof env>).reduce(
      (acc, key) => {
        if (!key.startsWith('__VITE_')) acc[key] = env[key];
        return acc;
      },
      {} as Record<string, any>,
    );

    // Execute the user app's entry module.
    return module.default.fetch(request, appEnv, ctx);
  },
};

let runtime: ViteRuntime & {runner: WorkerdRunner};
function fetchEntryModule(publicUrl: URL, env: ViteEnv) {
  if (!runtime) {
    let onHmrRecieve: ((payload: HMRPayload) => void) | undefined;

    let hmrReady = false;
    connectHmrWsClient(env)
      .then((hmrWs) => {
        hmrReady = true;
        hmrWs.addEventListener('message', (message) => {
          onHmrRecieve?.(JSON.parse(message.data?.toString()));
        });
      })
      .catch((error) => console.error(error));

    runtime = new ViteRuntime(
      {
        root: env.__VITE_ROOT,
        fetchModule: (id, importer) => {
          // Do not use WS here because the payload can exceed the limit
          // of WS in workerd. Instead, use fetch to get the module:
          const url = new URL(env.__VITE_FETCH_MODULE_PATHNAME, publicUrl);
          url.searchParams.set('id', id);
          if (importer) url.searchParams.set('importer', importer);

          return fetch(url).then((res) => res.json());
        },
        hmr: {
          connection: {
            isReady: () => hmrReady,
            send: () => {},
            onUpdate(receiver) {
              onHmrRecieve = receiver;
              return () => {
                onHmrRecieve = undefined;
              };
            },
          } satisfies HMRRuntimeConnection,
        },
      },
      new WorkerdRunner(),
    ) as ViteRuntime & {runner: WorkerdRunner};
  }

  runtime.runner.unsafeEval = env.__VITE_UNSAFE_EVAL;
  runtime.runner.codeLineOffset = Number(env.__VITE_CODE_LINE_OFFSET);

  return runtime.executeEntrypoint(env.__VITE_RUNTIME_EXECUTE_URL) as Promise<{
    default: {fetch: ExportedHandlerFetchHandler};
  }>;
}

type UnsafeEval = {
  newAsyncFunction(code: string, name?: string, ...args: string[]): Function;
};

class WorkerdRunner implements ViteModuleRunner {
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
    let idIndex = idList.indexOf(id);
    if (idIndex < 0) {
      idIndex = idList.push(id) - 1;
    }

    delete context[ssrImportMetaKey].filename;
    delete context[ssrImportMetaKey].dirname;

    const initModule = this.unsafeEval.newAsyncFunction(
      '"use strict";' + '\n'.repeat(this.codeLineOffset) + code,
      `${escapedId}_${idIndex}`,
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

  runExternalModule(filepath: string): Promise<any> {
    throw new Error('External modules are not supported');
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

function connectHmrWsClient(env: ViteEnv) {
  return fetch(env.__VITE_HMR_URL, {
    headers: {Upgrade: 'websocket'},
  }).then((response: unknown) => {
    const ws = (response as Response).webSocket;

    if (!ws) throw new Error('Failed to connect to HMR server.');

    ws.accept();
    return ws;
  });
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
                  runtime.runner.getGetRealFilenameFromEscapedId(result);
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
