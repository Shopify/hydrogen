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

const MODULE_FETCH_MAX_ATTEMPTS = 3;
const MODULE_FETCH_BASE_DELAY_MS = 200;
const MODULE_FETCH_TIMEOUT_MS = 10_000;
// Time for Vite's optimizer to finish re-bundling after a prebundle
// invalidation. The optimizer typically completes in <100ms for cached
// deps, but under heavy parallel load it can take longer.
const PREBUNDLE_RECOVERY_DELAY_MS = 500;

/**
 * Fetches a module from Vite's dev server with retry logic.
 * Retries on transient failures: 5xx server errors, timeouts, and
 * network errors. Client errors (4xx) fail immediately.
 */
async function fetchModuleWithRetry(url: URL) {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MODULE_FETCH_MAX_ATTEMPTS; attempt++) {
    let isClientError = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        MODULE_FETCH_TIMEOUT_MS,
      );

      let res: globalThis.Response;
      try {
        res = await fetch(url, {signal: controller.signal});
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.ok) {
        // Vite's transport invoke contract expects {result: Thenable<...>}
        return {result: res.json()};
      }

      // Client errors (4xx) are deterministic — retrying won't help
      isClientError = res.status < 500;
      const body = await res.text();
      lastError = new Error(
        `${O2_PREFIX} Module fetch failed (${res.status}): ${body}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (isClientError) throw lastError!;

    // Retry transient failures (5xx, timeout, network) with backoff +
    // jitter to avoid synchronized retry storms under parallel load
    if (attempt < MODULE_FETCH_MAX_ATTEMPTS) {
      const baseDelayInMs = attempt * MODULE_FETCH_BASE_DELAY_MS;
      const jitterInMs = Math.random() * baseDelayInMs * 0.5;
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayInMs + jitterInMs),
      );
    }
  }

  throw new Error(
    `${O2_PREFIX} Module fetch failed after ${MODULE_FETCH_MAX_ATTEMPTS} attempts: ` +
      (lastError?.message ?? 'unknown error'),
  );
}

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
let runtime: ModuleRunner | undefined;

/**
 * Setup the whole Vite runtime and HMR the first time this function is called.
 * Note: we can use the `env` object that comes from the first request even
 * for subsequent requests, so there's no need to refresh the pointer.
 * @returns The app's entry module.
 */
function fetchEntryModule(publicUrl: URL, env: ViteEnv) {
  return importEntryModule(publicUrl, env)
    .catch(async (error: Error) => {
      // Vite's optimizer can invalidate pre-bundled deps mid-request
      // (e.g. "There is a new version of the pre-bundle"). In a browser
      // Vite would trigger a full-page reload via HMR, but MiniOxygen
      // runs with hmr:false. Recreate the ModuleRunner and retry once
      // so the current request picks up the updated version hashes.
      if (isPrebundleVersionMismatch(error)) {
        resetRuntime();
        await new Promise((resolve) =>
          setTimeout(resolve, PREBUNDLE_RECOVERY_DELAY_MS),
        );
        return importEntryModule(publicUrl, env);
      }

      throw error;
    })
    .catch((error: Error) => {
      // If retry also failed (or error was not a version mismatch),
      // reset runtime for the next request and return error page.
      if (isPrebundleVersionMismatch(error)) {
        resetRuntime();
      }

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

function importEntryModule(publicUrl: URL, env: ViteEnv) {
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

              return fetchModuleWithRetry(url);
            }
            return Promise.resolve({
              error: `Error - invoke: ${JSON.stringify(data)}`,
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

  return runtime.import(env.__VITE_RUNTIME_EXECUTE_URL) as Promise<{
    default: {fetch: ExportedHandlerFetchHandler};
  }>;
}

function resetRuntime() {
  if (runtime) {
    runtime.close().catch((err) => {
      console.warn(`${O2_PREFIX} Failed to close stale ModuleRunner:`, err);
    });
    runtime = undefined;
  }
}

/**
 * Detects Vite's dep optimizer prebundle invalidation error.
 * This string comes from Vite's optimizer — see:
 * https://github.com/vitejs/vite/blob/v6.4.1/packages/vite/src/node/plugins/optimizedDeps.ts
 * (throwOutdatedRequest function).
 * If Vite changes this message, the recovery path silently stops working
 * and falls back to returning a 503 error page (same as before this fix).
 * Verify this string still exists after Vite upgrades.
 */
function isPrebundleVersionMismatch(error: Error): boolean {
  const message = error?.message ?? error?.stack ?? '';
  return message.includes('new version of the pre-bundle');
}
