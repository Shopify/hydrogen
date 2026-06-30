import {
  createFetchableDevEnvironment,
  type FetchableDevEnvironment,
  type ResolvedConfig,
  type ViteDevServer,
} from 'vite';
import type {
  InternalMiniOxygenOptions,
  MiniOxygenViteOptions,
} from './server-middleware.js';
import {
  WARMUP_PATHNAME,
  getViteUrl,
  startMiniOxygenRuntime,
} from './server-middleware.js';
import {toMiniflareRequest} from './utils.js';

export type MiniOxygenRuntimeOptions = Partial<
  Pick<
    MiniOxygenViteOptions,
    'entry' | 'env' | 'inspectorPort' | 'logRequestLine' | 'debug'
  >
> &
  InternalMiniOxygenOptions & {
    envPromise?: Promise<Record<string, any>>;
  };

type EnvOptions = {
  env?: Record<string, any>;
  envPromise?: Promise<Record<string, any>>;
};

export function hasProvidedEnvBindings(options: EnvOptions) {
  return (
    Object.prototype.hasOwnProperty.call(options, 'env') ||
    Object.prototype.hasOwnProperty.call(options, 'envPromise')
  );
}

type RuntimeOptionsResolver = (
  options: MiniOxygenRuntimeOptions,
  viteDevServer: ViteDevServer,
) => Promise<MiniOxygenViteOptions>;

export type MiniOxygenDevEnvironment = FetchableDevEnvironment & {
  configureRuntime(options: MiniOxygenRuntimeOptions): void;
};

export function mergeMiniOxygenRuntimeOptions(
  current: MiniOxygenRuntimeOptions,
  next: MiniOxygenRuntimeOptions,
): MiniOxygenRuntimeOptions {
  const merged = {
    ...current,
    ...next,
  };

  if (hasProvidedEnvBindings(current) || hasProvidedEnvBindings(next)) {
    merged.env = {...current.env, ...next.env};
  }

  if (current.crossBoundarySetup || next.crossBoundarySetup) {
    merged.crossBoundarySetup = [
      ...(current.crossBoundarySetup || []),
      ...(next.crossBoundarySetup || []),
    ];
  }

  return merged;
}

export function createMiniOxygenDevEnvironment(
  name: string,
  config: ResolvedConfig,
  runtimeOptions: MiniOxygenRuntimeOptions,
  resolveRuntimeOptions: RuntimeOptionsResolver,
): MiniOxygenDevEnvironment {
  let currentRuntimeOptions = runtimeOptions;
  let viteDevServer: ViteDevServer | undefined;
  let miniOxygen: ReturnType<typeof startMiniOxygenRuntime> | undefined;
  // Deduplicate concurrent first requests so the runtime only starts once.
  let pendingRuntime:
    | Promise<ReturnType<typeof startMiniOxygenRuntime>>
    | undefined;

  function runtimeHasStarted() {
    // Treat in-flight startup as "started" too so runtime options cannot
    // change while the first MiniOxygen instance is being created.
    return Boolean(pendingRuntime || (miniOxygen && !miniOxygen.isDisposed));
  }

  const environment = createFetchableDevEnvironment(name, config, {
    // Browser HMR uses the client environment. SSR updates are picked up on
    // the next request after Vite invalidates the SSR module graph.
    hot: false,
    handleRequest: async (request) => {
      if (miniOxygen?.isDisposed) {
        miniOxygen = undefined;
      }

      if (!miniOxygen) {
        if (!pendingRuntime) {
          pendingRuntime = startRuntime().catch((error) => {
            pendingRuntime = undefined;
            throw error;
          });
        }

        miniOxygen = await pendingRuntime;
        pendingRuntime = undefined;
      }

      const response = await miniOxygen.dispatchFetch(
        toMiniflareRequest(request),
      );

      return new Response(response.body as ReadableStream | null, {
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
      });
    },
  });

  const originalListen = environment.listen.bind(environment);
  const originalClose = environment.close.bind(environment);

  async function startRuntime() {
    if (!viteDevServer) {
      throw new Error(
        'MiniOxygen dev environment was used before the Vite server was ready.',
      );
    }

    const options = await resolveRuntimeOptions(
      currentRuntimeOptions,
      viteDevServer,
    );

    return startMiniOxygenRuntime(options);
  }

  async function warmup() {
    // Give Vite a brief moment to settle after listen/config reload before
    // sending the synthetic first request that boots MiniOxygen eagerly.
    const WARMUP_SETTLE_DELAY_MS = 200;
    await new Promise((resolve) => setTimeout(resolve, WARMUP_SETTLE_DELAY_MS));

    const viteUrl = viteDevServer && getViteUrl(viteDevServer);
    if (!viteUrl) return;

    await environment
      .dispatchFetch(new Request(new URL(WARMUP_PATHNAME, viteUrl)))
      .catch(() => {});
  }

  return Object.assign(environment, {
    configureRuntime(options: MiniOxygenRuntimeOptions) {
      if (runtimeHasStarted()) {
        throw new Error(
          'MiniOxygen runtime options cannot be updated after the runtime has started.',
        );
      }

      currentRuntimeOptions = mergeMiniOxygenRuntimeOptions(
        currentRuntimeOptions,
        options,
      );
    },
    async listen(server: ViteDevServer) {
      viteDevServer = server;
      await originalListen(server);
      void warmup();
    },
    async close() {
      await Promise.allSettled([originalClose(), miniOxygen?.dispose()]);
    },
  });
}
