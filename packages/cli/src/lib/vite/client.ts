/**
 * All the code in this file is executed in workerd. This file
 * is compiled at build time (tsup) to be transpiled to JS, and
 * then loaded as string in a workerd instance at runtime as
 * the worker entrypoint. It then requests modules to Vite
 * and evaluates them to run the app's backend code.
 */

import {
  ViteRuntime,
  ssrModuleExportsKey,
  type ViteModuleRunner,
  type ViteRuntimeModuleContext,
  type ResolvedResult,
  type SSRImportMetadata,
  type HMRRuntimeConnection,
} from 'vite/runtime';
import type {Response} from 'miniflare';
import type {HMRPayload} from 'vite';

export interface ViteEnv {
  __VITE_ROOT: string;
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
        sourcemapInterceptor: 'prepareStackTrace',
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

  return runtime.executeEntrypoint(env.__VITE_RUNTIME_EXECUTE_URL) as Promise<{
    default: {fetch: ExportedHandlerFetchHandler};
  }>;
}

// Ref: https://github.com/cloudflare/workerd/blob/main/src/workerd/api/unsafe.h
type UnsafeEval = {
  eval(code: string, name?: string): Function;
  newFunction(code: string, name?: string, ...args: string[]): Function;
  newAsyncFunction(code: string, name?: string, ...args: string[]): Function;
};

class WorkerdRunner implements ViteModuleRunner {
  unsafeEval: UnsafeEval | undefined;

  async runViteModule(
    context: ViteRuntimeModuleContext,
    code: string,
    id: string,
  ): Promise<any> {
    if (!this.unsafeEval) throw new Error('unsafeEval module is not set');

    // We can't use `newAsyncFunction` here because it uses the `id`
    // as the function name AND for sourcemaps. The `id` contains
    // symbols like `@`, `/` or `.` to make the sourcemaps work, but
    // these symbols are not allowed in function names. Therefore,
    // use `eval` instead with an anonymous function:
    const initModule = this.unsafeEval.eval(
      // 'use strict' is implied in ESM so we enable it here. Also, we
      // add an extra block scope (`{}`) to allow redeclaring variables
      // with the same name as the parameters.
      `'use strict';async (${Object.keys(context).join(',')})=>{{${code}\n}}`,
      id,
    );

    await initModule(...Object.values(context));

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
