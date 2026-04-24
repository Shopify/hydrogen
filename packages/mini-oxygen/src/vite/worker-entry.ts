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
  __VITE_INVOKE_MODULE: {fetch: typeof fetch};
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

type ViteInvokePayload = {
  name: string;
  data: unknown[];
};

export default {
  /**
   * Worker entry module that wraps the user app's entry module.
   */
  async fetch(request: Request, env: ViteEnv, context: ExecutionContext) {
    env.__VITE_SETUP_ENV(request);
    const url = new URL(request.url);

    // Fetch the app's entry module and cache it. E.g. `<root>/server.ts`
    const module = await fetchEntryModule(env);

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
 * Initialize the Vite module runner the first time this function is called.
 * Server updates are then picked up on the next request after Vite invalidates
 * the SSR module graph, so this stays request-driven instead of using push HMR.
 *
 * Note: we can use the `env` object from the first request for subsequent
 * requests too, so there's no need to refresh the pointer.
 *
 * @returns The app's entry module.
 */
function fetchEntryModule(env: ViteEnv) {
  if (!runtime) {
    runtime = new ModuleRunner(
      {
        sourcemapInterceptor: 'prepareStackTrace',
        transport: {
          invoke: async (payload) => {
            // Do not use WS here because the payload can exceed the limit
            // of WS in workerd. Instead, use a service binding to forward
            // runner RPC payloads back to Vite's built-in invoke handlers.
            if (
              payload.type === 'custom' &&
              payload.event === 'vite:invoke' &&
              isViteInvokePayload(payload.data)
            ) {
              // TODO: Remove this shim when Vite 6 support is dropped.
              // workerd has no Node builtins; return empty list directly
              // so Vite 6 servers (which have no getBuiltins handler) still work.
              // Vite 7+ handles getBuiltins internally.
              if (payload.data.name === 'getBuiltins') {
                return Promise.resolve({result: []});
              }

              return env.__VITE_INVOKE_MODULE
                .fetch(
                  new Request('http://mini-oxygen', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload),
                  }),
                )
                .then((res) => res.json());
            }

            return Promise.resolve({
              error: {message: `Error - invoke: ${JSON.stringify(payload)}`},
            });
          },
        },
        hmr: false,
      },
      {
        // Adopted from https://github.com/cloudflare/workers-sdk/blob/main/packages/vite-plugin-cloudflare/src/runner-worker/module-runner.ts#L77-L91
        runExternalModule(filepath: string): Promise<any> {
          if (
            filepath.includes('/node_modules') &&
            !filepath.includes('/node_modules/.vite')
          ) {
            throw new Error(
              `[Error] Trying to import non-prebundled module (only prebundled modules are allowed): ${filepath}` +
                '\n\n(have you externalized the module via `resolve.external`?)',
            );
          }

          filepath = filepath.replace(/^file:\/\//, '');
          return import(filepath);
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

function isViteInvokePayload(payload: unknown): payload is ViteInvokePayload {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    'name' in payload &&
    'data' in payload &&
    Array.isArray((payload as ViteInvokePayload).data),
  );
}
