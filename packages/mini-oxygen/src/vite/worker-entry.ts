/**
 * All the code in this file is executed in workerd. This file
 * is compiled at build time (tsup) to be transpiled to JS, and
 * then loaded as string in a workerd instance at runtime as
 * the worker entrypoint. It then requests modules to Vite
 * and evaluates them to run the app's backend code.
 */

import {
  EvaluatedModuleNode,
  ModuleRunner,
  ssrModuleExportsKey,
  type ModuleRunnerContext,
} from 'vite/module-runner';
import type {HotPayload} from 'vite';
import type {Response} from 'miniflare';
import {withRequestHook} from '../worker/handler.js';

export interface ViteEnv {
  __VITE_ROOT: string;
  __VITE_FETCH_MODULE_PATHNAME: string;
  __VITE_RUNTIME_EXECUTE_URL: string;
  __VITE_WARMUP_PATHNAME: string;
  __VITE_REQUEST_HOOK?: {fetch: typeof fetch};
  __VITE_SETUP_ENV: (request: Request) => void;
  // Ref: https://github.com/cloudflare/workerd/blob/main/src/workerd/api/unsafe.h
  __VITE_UNSAFE_EVAL: {
    eval(code: string, name?: string): Function;
    newFunction(code: string, name?: string, ...args: string[]): Function;
    newAsyncFunction(code: string, name?: string, ...args: string[]): Function;
  };
}

const O2_PREFIX = '[o2:runtime]';

export default {
  /**
   * Worker entry module that wraps the user app's entry module.
   */
  async fetch(request: Request, env: ViteEnv, context: ExecutionContext) {
    env.__VITE_SETUP_ENV(request);
    const url = new URL(request.url);

    // Fetch the app's entry module and cache it. E.g. `<root>/server.ts`
    const module = await fetchEntryModule(url, env);

    if ('errorResponse' in module) {
      return module.errorResponse;
    }

    // Return early for warmup requests after loading the entry module.
    if (url.pathname === env.__VITE_WARMUP_PATHNAME) {
      return new globalThis.Response(null);
    }

    const handleRequest = () =>
      module.default.fetch(request, createUserEnv(env), context);

    // Execute the user app's entry module.
    return env.__VITE_REQUEST_HOOK
      ? withRequestHook({
          request,
          context,
          hook: env.__VITE_REQUEST_HOOK,
          handleRequest,
        })
      : handleRequest();
  },
};

/**
 * Clean up variables that are only used for dev orchestration.
 */
function createUserEnv(env: ViteEnv) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !key.startsWith('__VITE_')),
  );
}

/**
 * The Vite runtime instance. It's a singleton because it's shared
 * across all the requests to workerd and it's stateful (module cache).
 */
let runtime: ModuleRunner;

/**
 * Setup the whole Vite runtime and HMR the first time this function is called.
 * Note: we can use the `env` object that comes from the first request even
 * for subsequent requests, so there's no need to refresh the pointer.
 * @returns The app's entry module.
 */
function fetchEntryModule(publicUrl: URL, env: ViteEnv) {
  if (!runtime) {
    runtime = new ModuleRunner(
      {
        root: env.__VITE_ROOT,
        sourcemapInterceptor: 'prepareStackTrace',
        transport: {
          invoke: async (data) => {
            // Do not use WS here because the payload can exceed the limit
            // of WS in workerd. Instead, use fetch to get the module:
            if (data.type === 'custom') {
              const customData = data.data;
              const url = new URL(env.__VITE_FETCH_MODULE_PATHNAME, publicUrl);
              url.searchParams.set('id', customData.data[0]);
              if (customData.data)
                url.searchParams.set('importer', customData.name);

              return fetch(url).then((res) => ({result: res.json()}));
            }
            return Promise.resolve({
              error: `Error - invoke: ${JSON.stringify(data)}`,
            });
          },
        },
        hmr: false,
      },
      {
        runExternalModule(filepath: string): Promise<any> {
          // Might need to implement this in the future if we enable `nodejs_compat` flag,
          // or add custom Oxygen runtime modules (e.g. `import kv from 'oxygen:kv';`).
          throw new Error(
            `${O2_PREFIX} External modules are not supported: "${filepath}"`,
          );
        },

        async runInlinedModule(
          context: ModuleRunnerContext,
          code: string,
          module: Readonly<EvaluatedModuleNode>,
        ): Promise<any> {
          if (!env.__VITE_UNSAFE_EVAL) {
            throw new Error(`${O2_PREFIX} unsafeEval module is not set`);
          }

          // We can't use `newAsyncFunction` here because it uses the `id`
          // as the function name AND for sourcemaps. The `id` contains
          // symbols like `@`, `/` or `.` to make the sourcemaps work, but
          // these symbols are not allowed in function names. Therefore,
          // use `eval` instead with an anonymous function:
          const initModule = env.__VITE_UNSAFE_EVAL.eval(
            // 'use strict' is implied in ESM so we enable it here. Also, we
            // add an extra block scope (`{}`) to allow redeclaring variables
            // with the same name as the parameters.
            `'use strict';async (${Object.keys(context).join(
              ',',
            )})=>{{${code}\n}}`,
            module.id,
          );

          await initModule(...Object.values(context));

          Object.freeze(context[ssrModuleExportsKey]);
        },
      },
    );
  }

  return (
    runtime.import(env.__VITE_RUNTIME_EXECUTE_URL) as Promise<{
      default: {fetch: ExportedHandlerFetchHandler};
    }>
  ).catch((error: Error) => {
    return {
      errorResponse: new globalThis.Response(
        error?.stack ?? error?.message ?? 'Internal error',
        {
          status: 503,
          statusText: 'executeEntrypoint error',
        },
      ),
    };
  });
}
