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
import {miniOxygenHandler} from './handler.js';
import {OXYGEN_HEADERS_MAP} from '../common/headers.js';
import {findPort} from '../common/find-port.js';
import {OXYGEN_COMPAT_PARAMS} from '../common/compat.js';

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
  logRequestLine?: LogRequestLine | null;
  inspectWorkerName?: string;
};

export type MiniOxygenInstance = ReturnType<typeof createMiniOxygen>;

export function createMiniOxygen({
  debug = false,
  inspectorPort,
  assets,
  sourceMapPath = '',
  logRequestLine,
  inspectWorkerName,
  ...miniflareOptions
}: MiniOxygenOptions) {
  const mf = new Miniflare(
    buildMiniflareOptions(miniflareOptions, logRequestLine, assets),
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
            logRequestLine,
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

type LogRequestLine = (
  request: Request,
  opt: {responseStatus: number; durationMs: number},
) => void;

const defaultLogRequestLine: LogRequestLine = (request, {responseStatus}) => {
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

function buildMiniflareOptions(
  {workers, ...mfOverwriteOptions}: InputMiniflareOptions,
  logRequestLine: LogRequestLine | null = defaultLogRequestLine,
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

  async function logRequest(request: Request): Promise<Response> {
    const durationMs = Number(request.headers.get('o2-duration-ms') || 0);
    const responseStatus = Number(
      request.headers.get('o2-response-status') || 200,
    );

    logRequestLine?.(request, {responseStatus, durationMs});

    return new Response('ok');
  }

  return {
    cf: false,
    verbose: false,
    log: new NoOpLog(),
    port: 0,
    // Avoid using 'host' here, there's a bug when mixed with port:0 in Node 18:
    // https://github.com/cloudflare/workers-sdk/issues/4563
    // host: 'localhost',
    inspectorPort: 0,
    liveReload: false,
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
    ...mfOverwriteOptions,
    workers: [
      {
        name: ROUTING_WORKER_NAME,
        modules: true,
        script: `export default { fetch: ${miniOxygenHandler.toString()} }`,
        bindings: {
          staticAssetExtensions,
          oxygenHeadersMap,
        },
        serviceBindings: {
          entry: entryWorker.name,
          logRequest,
          ...(handleAssets && {assets: handleAssets}),
        },
      },
      ...workers.map((worker) => ({
        ...OXYGEN_COMPAT_PARAMS,
        ...worker,
      })),
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
