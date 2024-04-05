import {
  Miniflare,
  NoOpLog,
  Request,
  Response,
  fetch,
  type RequestInit,
  type ResponseInit,
  type SharedOptions,
  type CORE_PLUGIN,
  type MiniflareOptions as OutputMiniflareOptions,
} from 'miniflare';
import {createInspectorConnector} from './inspector.js';
import {
  STATIC_ASSET_EXTENSIONS,
  buildAssetsUrl,
  createAssetsServer,
} from './assets.js';
import {
  getMiniOxygenHandlerScript,
  type MiniOxygenHandlerEnv,
} from './handler.js';
import {OXYGEN_HEADERS_MAP} from '../common/headers.js';
import {findPort} from '../common/find-port.js';
import {OXYGEN_COMPAT_PARAMS} from '../common/compat.js';
import {isO2Verbose} from '../common/debug.js';

export {
  buildAssetsUrl,
  Request,
  Response,
  fetch,
  type RequestInit,
  type ResponseInit,
};

const DEFAULT_PUBLIC_INSPECTOR_PORT = 9229;
const DEFAULT_ASSETS_PORT = 9100;

type AssetOptions =
  | {
      /** Directory to serve files. If omitted, no asset server is created. */
      directory: string;
      /** Port to serve files from. Defaults to 9100. */
      port?: number;
      origin?: never;
    }
  | {
      directory?: never;
      port?: never;
      /** Optional origin for an external asset server. */
      origin: string;
    };

type InputMiniflareOptions = Omit<SharedOptions, 'cf'> & {
  // Miniflare supports other type of options for D1, DO, KV, etc.
  // This is the only shape we support in MiniOxygen:
  workers: Array<typeof CORE_PLUGIN.options._output & {name: string}>;
};

type ReloadableOptions = Pick<MiniOxygenOptions, 'workers'>;
type GetNewOptions = (
  previousOptions: ReloadableOptions,
) => ReloadableOptions | Promise<ReloadableOptions>;

export type MiniOxygenOptions = InputMiniflareOptions & {
  debug?: boolean;
  sourceMapPath?: string;
  assets?: AssetOptions;
  requestHook?: RequestHook | null;
  inspectWorkerName?: string;
};

export type MiniOxygenInstance = ReturnType<typeof createMiniOxygen>;

export function createMiniOxygen({
  debug = false,
  inspectorPort,
  assets,
  sourceMapPath = '',
  requestHook,
  inspectWorkerName,
  ...miniflareOptions
}: MiniOxygenOptions) {
  const mf = new Miniflare(
    buildMiniflareOptions(miniflareOptions, requestHook, assets),
  );

  if (!sourceMapPath) {
    const mainWorker =
      (inspectWorkerName &&
        miniflareOptions.workers.find(
          ({name}) => name === inspectWorkerName,
        )) ||
      miniflareOptions.workers[0];

    if ('scriptPath' in mainWorker) {
      sourceMapPath = mainWorker.scriptPath + '.map';
    } else if (Array.isArray(mainWorker?.modules)) {
      const modulePath = mainWorker?.modules[0]!.path;
      sourceMapPath = modulePath + '.map';
    }
  }

  let reconnect: ReturnType<typeof createInspectorConnector>;

  const ready = mf.ready.then(async (workerUrl) => {
    const [privateInspectorUrl, publicInspectorPort] = await Promise.all([
      mf.getInspectorURL(),
      debug
        ? inspectorPort ?? findPort(DEFAULT_PUBLIC_INSPECTOR_PORT)
        : undefined,
    ]);

    reconnect = createInspectorConnector({
      sourceMapPath,
      publicInspectorPort,
      privateInspectorPort: Number(privateInspectorUrl.port),
      workerName:
        inspectWorkerName ??
        miniflareOptions.workers[0]?.name ??
        ROUTING_WORKER_NAME,
    });

    await reconnect();

    return {
      workerUrl,
      inspectorUrl: debug
        ? new URL(
            privateInspectorUrl.href.replace(
              privateInspectorUrl.port,
              String(publicInspectorPort),
            ),
          )
        : undefined,
    };
  });

  const assetsServer = assets?.directory
    ? createAssetsServer(assets.directory)
    : undefined;

  assetsServer?.listen(assets?.port ?? DEFAULT_ASSETS_PORT);

  return {
    ready,
    dispatchFetch: mf.dispatchFetch,
    getBindings: mf.getBindings,
    getCaches: mf.getCaches,
    getWorker: mf.getWorker,
    async reload(getNewOptions?: GetNewOptions) {
      const newOptions = await getNewOptions?.({
        workers: miniflareOptions.workers,
      });

      await reconnect(() =>
        mf.setOptions(
          buildMiniflareOptions(
            {...miniflareOptions, ...newOptions},
            requestHook,
            assets,
          ),
        ),
      );
    },
    async dispose() {
      assetsServer?.closeAllConnections();
      assetsServer?.close();
      await mf.dispose();
    },
  };
}

type RequestHook = (
  request: Request,
  opt: {responseStatus: number; durationMs: number},
) => void | Promise<void>;

const defaultRequestHook: RequestHook = (request, {responseStatus}) => {
  console.log(
    `${request.method}  ${responseStatus}  ${request.url.replace(
      new URL(request.url).origin,
      '',
    )}`,
  );
};

const ROUTING_WORKER_NAME = 'mini-oxygen';

const oxygenHeadersMap = Object.values(OXYGEN_HEADERS_MAP).reduce(
  (acc, item) => {
    acc[item.name] = item.defaultValue;
    return acc;
  },
  {} as Record<string, string>,
);

// Opt-out of TLS validation in the worker environment,
// and run network requests in Node environment.
// https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue
const UNSAFE_OUTBOUND_SERVICE = {
  async outboundService(request: Request) {
    const response = await fetch(request.url, request);
    // Remove brotli encoding:
    // https://github.com/cloudflare/workers-sdk/issues/5345
    response.headers.delete('Content-Encoding');
    return response;
  },
};

function buildMiniflareOptions(
  {workers, ...mfOverwriteOptions}: InputMiniflareOptions,
  requestHook: RequestHook | null = defaultRequestHook,
  assetsOptions?: AssetOptions,
): OutputMiniflareOptions {
  const entryWorker = workers.find((worker) => !!worker.name);
  if (!entryWorker?.name) {
    throw new Error('You must provide at least 1 named worker.');
  }

  const handleAssets = assetsOptions && createAssetHandler(assetsOptions);
  const staticAssetExtensions = handleAssets
    ? STATIC_ASSET_EXTENSIONS.slice()
    : null;

  const wrappedHook = requestHook
    ? async (request: Request) => {
        const durationMs = Number(request.headers.get('o2-duration-ms') || 0);
        const responseStatus = Number(
          request.headers.get('o2-response-status') || 200,
        );

        await requestHook(request, {
          responseStatus,
          durationMs,
        });

        return new Response('ok');
      }
    : null;

  const wrappedBindings = new Set(
    workers
      .flatMap((worker) => Object.values(worker.wrappedBindings || {}))
      .filter(
        (wrappedBinding) => typeof wrappedBinding === 'string',
      ) as string[],
  );

  return {
    cf: false,
    port: 0,
    // Avoid using 'host' here, there's a bug when mixed with port:0 in Node 18:
    // https://github.com/cloudflare/workers-sdk/issues/4563
    // host: 'localhost',
    inspectorPort: 0,
    liveReload: false,
    ...(isO2Verbose()
      ? {verbose: true}
      : {
          verbose: false,
          log: new NoOpLog(),
          handleRuntimeStdio(stdout, stderr) {
            // TODO: handle runtime stdio and remove inspector logs
            // stdout.pipe(process.stdout);
            // stderr.pipe(process.stderr);

            // Destroy these streams to prevent memory leaks
            // until we start piping them to the terminal.
            // https://github.com/Shopify/hydrogen/issues/1720
            stdout.destroy();
            stderr.destroy();
          },
        }),
    ...mfOverwriteOptions,
    workers: [
      {
        name: ROUTING_WORKER_NAME,
        modules: true,
        script: getMiniOxygenHandlerScript(),
        bindings: {
          staticAssetExtensions,
          oxygenHeadersMap,
        } satisfies OnlyBindings<MiniOxygenHandlerEnv>,
        serviceBindings: {
          entry: entryWorker.name,
          ...(wrappedHook && {hook: wrappedHook}),
          ...(handleAssets && {assets: handleAssets}),
        } satisfies OnlyServices<MiniOxygenHandlerEnv>,
      },
      ...workers.map((worker) => {
        const isNormalWorker = !wrappedBindings.has(worker.name);
        const useUnsafeOutboundService =
          isNormalWorker && process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

        return {
          ...(isNormalWorker && OXYGEN_COMPAT_PARAMS),
          ...(useUnsafeOutboundService && UNSAFE_OUTBOUND_SERVICE),
          ...worker,
        };
      }),
    ],
  };
}

function createAssetHandler(options: Partial<AssetOptions>) {
  const assetsServerOrigin =
    options.origin ?? buildAssetsUrl(options.port ?? DEFAULT_ASSETS_PORT);

  return async (request: Request): Promise<Response> => {
    return fetch(
      new Request(
        request.url.replace(
          new URL(request.url).origin + '/',
          assetsServerOrigin,
        ),
        request as RequestInit,
      ),
    );
  };
}

// --- Utility types:
type OnlyServiceKeys<T> = Exclude<
  {
    [P in keyof T]: NonNullable<T[P]> extends {fetch: Function} ? P : never;
  }[keyof T],
  undefined
>;

type OnlyServices<T> = Pick<
  {[key in keyof T]: string | ((request: Request) => Promise<any>)},
  OnlyServiceKeys<T>
>;

type UnionUndefinedToNull<T> = T extends undefined ? null : T;
type OnlyBindings<T> = Omit<
  {[key in keyof T]: UnionUndefinedToNull<T[key]>},
  OnlyServiceKeys<T>
>;
