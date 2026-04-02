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

// Vite's dep optimizer sets this code on errors thrown when a prebundled
// dependency is invalidated mid-request. Defined in Vite's source at
// packages/vite/src/shared/constants.ts — not part of Vite's public API,
// but stable since Vite 2.9 and used by Vite's own transform middleware.
const VITE_ERR_OUTDATED_OPTIMIZED_DEP = 'ERR_OUTDATED_OPTIMIZED_DEP';

const MODULE_FETCH_MAX_ATTEMPTS = 3;
const MODULE_FETCH_BASE_DELAY_MS = 200;
const MODULE_FETCH_TIMEOUT_MS = 10_000;
// Time for Vite's optimizer to finish re-bundling after a prebundle
// invalidation. The optimizer typically completes in <100ms for cached
// deps, but under heavy parallel load it can take longer.
const PREBUNDLE_RECOVERY_DELAY_MS = 500;

/**
 * Wraps `fetch` with an AbortController-based timeout so every
 * network call has a bounded wait time.
 * @internal Exported for unit testing — not part of the public API.
 */
export async function fetchWithTimeout(
  url: URL,
  timeoutInMs: number,
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutInMs);
  try {
    return await fetch(url, {signal: controller.signal});
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches a module from Vite's dev server with retry logic.
 * Retries on transient failures: 5xx server errors, timeouts, and
 * network errors. Client errors (4xx) fail immediately.
 * @internal Exported for unit testing — not part of the public API.
 */
export async function fetchModuleWithRetry(url: URL) {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MODULE_FETCH_MAX_ATTEMPTS; attempt++) {
    let res: globalThis.Response | undefined;
    try {
      res = await fetchWithTimeout(url, MODULE_FETCH_TIMEOUT_MS);
    } catch (error) {
      // Network/timeout errors are transient — fall through to retry
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (res) {
      if (res.ok) {
        // Vite's transport invoke contract expects {result: Thenable<...>}
        return {result: res.json()};
      }

      const body = await res.text();
      const error = new Error(
        `${O2_PREFIX} Module fetch failed (${res.status}): ${body}`,
      );

      // Propagate error code from the server response (e.g.,
      // Vite's ERR_OUTDATED_OPTIMIZED_DEP) so callers can identify
      // specific error types without string matching on the message.
      try {
        const parsed = JSON.parse(body);
        if (parsed?.code) (error as any).code = parsed.code;
      } catch {
        // Body wasn't JSON — no code to propagate
      }

      // Client errors (4xx) are deterministic — retrying won't help
      if (res.status < 500) throw error;

      // Server errors (5xx) are transient — fall through to retry
      lastError = error;
    }

    // Exponential backoff with jitter to avoid synchronized retry storms
    if (attempt < MODULE_FETCH_MAX_ATTEMPTS) {
      const baseDelayInMs =
        MODULE_FETCH_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const jitterInMs = Math.random() * baseDelayInMs * 0.5;
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayInMs + jitterInMs),
      );
    }
  }

  const finalError = new Error(
    `${O2_PREFIX} Module fetch failed after ${MODULE_FETCH_MAX_ATTEMPTS} attempts: ` +
      (lastError?.message ?? 'unknown error'),
  );

  // Preserve error code from the last attempt so callers can identify
  // specific error types (e.g., prebundle invalidation) after retries.
  const lastErrorCode = (lastError as any)?.code;
  if (lastErrorCode) (finalError as any).code = lastErrorCode;

  throw finalError;
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
 * Shared recovery promise that deduplicates the reset+delay phase of
 * concurrent prebundle mismatch recovery. When multiple parallel requests
 * detect a mismatch simultaneously, only the first starts the
 * reset+delay cycle; others await the same delay but each retries the
 * import independently afterward.
 */
let recoveryPromise: Promise<void> | undefined;

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
        // Deduplicate the reset+delay: only the first request resets
        // the runtime. Others share the same delay, then each retries
        // the import independently.
        if (!recoveryPromise) {
          recoveryPromise = (async () => {
            resetRuntime();
            await new Promise((resolve) =>
              setTimeout(resolve, PREBUNDLE_RECOVERY_DELAY_MS),
            );
          })().finally(() => {
            recoveryPromise = undefined;
          });
        }
        await recoveryPromise;
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
 * Detects Vite's dep optimizer prebundle invalidation error by checking
 * the error code propagated from the server middleware. Vite's
 * `throwOutdatedRequest` sets `error.code = 'ERR_OUTDATED_OPTIMIZED_DEP'`
 * (see packages/vite/src/node/plugins/optimizedDeps.ts), and our
 * server-middleware preserves it in the JSON error response.
 * @internal Exported for unit testing — not part of the public API.
 */
export function isPrebundleVersionMismatch(error: Error): boolean {
  return (error as any)?.code === VITE_ERR_OUTDATED_OPTIMIZED_DEP;
}
