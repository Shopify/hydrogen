import {
  createFetchableDevEnvironment,
  type FetchableDevEnvironment,
  type FetchableDevEnvironmentContext,
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
  toMiniflareRequest,
} from './server-middleware.js';

export type MiniOxygenRuntimeOptions = Partial<
  Pick<
    MiniOxygenViteOptions,
    'entry' | 'env' | 'inspectorPort' | 'logRequestLine' | 'debug'
  >
> &
  InternalMiniOxygenOptions & {
    envPromise?: Promise<Record<string, any>>;
  };

type RuntimeOptionsResolver = (
  options: MiniOxygenRuntimeOptions,
  viteDevServer: ViteDevServer,
) => Promise<MiniOxygenViteOptions>;

type MiniOxygenEnvironmentContext = Pick<
  FetchableDevEnvironmentContext,
  'transport'
>;

const MINI_OXYGEN_ENVIRONMENT = Symbol('mini-oxygen-environment');

export type MiniOxygenDevEnvironment = FetchableDevEnvironment & {
  [MINI_OXYGEN_ENVIRONMENT]: true;
  configureRuntime(options: MiniOxygenRuntimeOptions): void;
  getRuntimeOptions(): MiniOxygenRuntimeOptions;
};

export function mergeMiniOxygenRuntimeOptions(
  current: MiniOxygenRuntimeOptions,
  next: MiniOxygenRuntimeOptions,
): MiniOxygenRuntimeOptions {
  return {
    ...current,
    ...next,
    env: {...current.env, ...next.env},
    crossBoundarySetup: [
      ...(current.crossBoundarySetup || []),
      ...(next.crossBoundarySetup || []),
    ],
  };
}

export function createMiniOxygenDevEnvironment(
  name: string,
  config: ResolvedConfig,
  context: MiniOxygenEnvironmentContext,
  runtimeOptions: MiniOxygenRuntimeOptions,
  resolveRuntimeOptions: RuntimeOptionsResolver,
): MiniOxygenDevEnvironment {
  let currentRuntimeOptions = runtimeOptions;
  let viteDevServer: ViteDevServer | undefined;
  let miniOxygen: ReturnType<typeof startMiniOxygenRuntime> | undefined;
  let pendingRuntime:
    | Promise<ReturnType<typeof startMiniOxygenRuntime>>
    | undefined;

  const environment = createFetchableDevEnvironment(name, config, {
    hot: false,
    transport: context.transport,
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

      return new Response(response.body as unknown as BodyInit, {
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

    miniOxygen = startMiniOxygenRuntime(options);
    return miniOxygen;
  }

  async function warmup() {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const viteUrl = viteDevServer && getViteUrl(viteDevServer);
    if (!viteUrl) return;

    await environment
      .dispatchFetch(new Request(new URL(WARMUP_PATHNAME, viteUrl)))
      .catch(() => {});
  }

  return Object.assign(environment, {
    [MINI_OXYGEN_ENVIRONMENT]: true as const,
    configureRuntime(options: MiniOxygenRuntimeOptions) {
      currentRuntimeOptions = mergeMiniOxygenRuntimeOptions(
        currentRuntimeOptions,
        options,
      );
    },
    getRuntimeOptions() {
      return currentRuntimeOptions;
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

export function isMiniOxygenDevEnvironment(
  value: unknown,
): value is MiniOxygenDevEnvironment {
  return Boolean(
    value && typeof value === 'object' && MINI_OXYGEN_ENVIRONMENT in value,
  );
}
