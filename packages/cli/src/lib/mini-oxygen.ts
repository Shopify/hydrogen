import {readdir, readFile} from 'node:fs/promises';
import {
  outputInfo,
  outputToken,
  outputContent,
} from '@shopify/cli-kit/node/output';
import {resolvePath, extname} from '@shopify/cli-kit/node/path';
import colors from '@shopify/cli-kit/node/colors';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import mime from 'mime';
import {
  Miniflare,
  type MiniflareOptions,
  Request,
  Response,
  fetch,
  NoOpLog,
} from 'miniflare';
import {connectToInspector, findInspectorUrl} from './mini-oxygen-inspector.js';

type MiniOxygenOptions = {
  root: string;
  port?: number;
  watch?: boolean;
  buildPathClient: string;
  buildPathWorkerFile: string;
  env?: {[key: string]: string};
};

export type MiniOxygen = Awaited<ReturnType<typeof startMiniOxygen>>;

export async function startMiniOxygen({
  root,
  port = 3000,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env,
}: MiniOxygenOptions) {
  const inspectorPort = 8787;

  const buildMiniOxygenOptions = async () =>
    ({
      cf: false,
      verbose: false,
      port: port,
      log: new NoOpLog(),
      liveReload: watch,
      inspectorPort,
      host: 'localhost',
      workers: [
        {
          name: 'mini-oxygen',
          modules: true,
          script: `export default { fetch: ${miniOxygenHandler.toString()} }`,
          bindings: {
            initialAssets: await readdir(buildPathClient),
            oxygenHeadersMap: Object.values(OXYGEN_HEADERS_MAP).reduce(
              (acc, item) => {
                acc[item.name] = item.defaultValue;
                return acc;
              },
              {} as Record<string, string>,
            ),
          },
          serviceBindings: {
            hydrogen: 'hydrogen',
            assets: createAssetHandler(buildPathClient),
            logRequest,
          },
        },
        {
          name: 'hydrogen',
          modules: [
            {
              type: 'ESModule',
              path: resolvePath(root, buildPathWorkerFile),
              contents: await readFile(resolvePath(root, buildPathWorkerFile)),
            },
          ],
          bindings: {...env},
          compatibilityFlags: ['streams_enable_constructors'],
          compatibilityDate: '2022-10-31',
        },
      ],
    } satisfies MiniflareOptions);

  let miniOxygenOptions = await buildMiniOxygenOptions();
  const miniOxygen = new Miniflare(miniOxygenOptions);
  const listeningAt = (await miniOxygen.ready).origin;

  const sourceMapPath = buildPathWorkerFile + '.map';
  let inspectorUrl = await findInspectorUrl(inspectorPort);
  let cleanupInspector = inspectorUrl
    ? connectToInspector({inspectorUrl, sourceMapPath})
    : undefined;

  return {
    port,
    listeningAt,
    async reload(nextOptions?: Partial<Pick<MiniOxygenOptions, 'env'>>) {
      miniOxygenOptions = await buildMiniOxygenOptions();

      if (nextOptions) {
        const hydrogen = miniOxygenOptions.workers.find(
          (worker) => worker.name === 'hydrogen',
        );

        if (hydrogen) {
          hydrogen.bindings = {...(nextOptions?.env ?? env)};
        }
      }

      cleanupInspector?.();
      await miniOxygen.setOptions(miniOxygenOptions);
      inspectorUrl ??= await findInspectorUrl(inspectorPort);
      if (inspectorUrl) {
        cleanupInspector = connectToInspector({inspectorUrl, sourceMapPath});
      }
    },
    showBanner(options?: {
      mode?: string;
      headlinePrefix?: string;
      extraLines?: string[];
      appName?: string;
    }) {
      console.log('');
      renderSuccess({
        headline: `${options?.headlinePrefix ?? ''}MiniOxygen ${
          options?.mode ?? 'development'
        } server running.`,
        body: [
          `View ${options?.appName ?? 'Hydrogen'} app: ${listeningAt}`,
          ...(options?.extraLines ?? []),
        ],
      });
      console.log('');
    },
  };
}

type Service = {fetch: typeof fetch};
async function miniOxygenHandler(
  request: Request,
  env: {
    hydrogen: Service;
    assets: Service;
    logRequest: Service;
    initialAssets: string[];
    oxygenHeadersMap: Record<string, string>;
  },
) {
  if (request.method === 'GET') {
    const pathname = new URL(request.url).pathname;
    const isInInitialAssets = env.initialAssets.some(
      (asset) =>
        pathname === '/' + asset || pathname.startsWith('/' + asset + '/'),
    );

    const extension = pathname.split('.').at(-1);
    const hasAssetExtension =
      extension &&
      /^\.(js|css|jpe?g|png|gif|webp|svg|mp4|webm|txt|pdf|ico)$/i.test(
        extension,
      );

    if (isInInitialAssets || hasAssetExtension) {
      const response = await env.assets.fetch(request.clone());
      if (response.status !== 404) return response;
    }
  }

  // Clone before using body (in POST requests)
  const requestToLog = new Request(request.clone());

  const startTimeMs = Date.now();
  const response = await env.hydrogen.fetch(request, {
    headers: {
      ...env.oxygenHeadersMap,
      ...Object.fromEntries(request.headers.entries()),
    },
  });

  requestToLog.headers.set('h2-response-status', String(response.status));
  requestToLog.headers.set('h2-duration-ms', String(Date.now() - startTimeMs));
  await env.logRequest.fetch(requestToLog);

  return response;
}

function createAssetHandler(buildPathClient: string) {
  return async (request: Request): Promise<Response> => {
    const relativeAssetPath = new URL(request.url).pathname.replace('/', '');
    if (relativeAssetPath) {
      try {
        const absoluteAssetPath = resolvePath(
          buildPathClient,
          relativeAssetPath,
        );
        const fileContent = await readFile(absoluteAssetPath);
        return new Response(fileContent, {
          headers: {
            'content-type':
              mime.getType(extname(relativeAssetPath)) || 'text/plain',
          },
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return new Response('Not Found', {status: 404});
  };
}

async function logRequest(request: Request): Promise<Response> {
  const dummyResponse = new Response('ok');
  let responseStatus = 200;

  try {
    responseStatus = Number(request.headers.get('h2-response-status') || 200);
    const durationMs = Number(request.headers.get('h2-duration-ms') || 0);

    const url = new URL(request.url);
    if (['/graphiql'].includes(url.pathname)) return dummyResponse;

    const isDataRequest = url.searchParams.has('_data');
    let route = request.url.replace(url.origin, '');
    let info = '';
    let type = 'render';

    if (isDataRequest) {
      type = request.method === 'GET' ? 'loader' : 'action';
      const dataParam = url.searchParams.get('_data')?.replace('routes/', '');
      route = url.pathname;
      info = `[${dataParam}]`;
    }

    const colorizeStatus =
      responseStatus < 300
        ? outputToken.green
        : responseStatus < 400
        ? outputToken.cyan
        : outputToken.errorText;

    outputInfo(
      outputContent`${request.method.padStart(6)}  ${colorizeStatus(
        String(responseStatus),
      )}  ${outputToken.italic(type.padEnd(7, ' '))} ${route} ${
        durationMs > 0 ? colors.dim(` ${durationMs}ms`) : ''
      }${info ? '  ' + colors.dim(info) : ''}${
        request.headers.get('purpose') === 'prefetch'
          ? outputToken.italic(colors.dim('  prefetch'))
          : ''
      }`,
    );
  } catch {
    if (request && responseStatus) {
      outputInfo(`${request.method} ${responseStatus} ${request.url}`);
    }
  }

  return dummyResponse;
}

// https://shopify.dev/docs/custom-storefronts/oxygen/worker-runtime-apis#custom-headers
const OXYGEN_HEADERS_MAP = {
  ip: {name: 'oxygen-buyer-ip', defaultValue: '127.0.0.1'},
  longitude: {name: 'oxygen-buyer-longitude', defaultValue: '-122.40140'},
  latitude: {name: 'oxygen-buyer-latitude', defaultValue: '37.78855'},
  continent: {name: 'oxygen-buyer-continent', defaultValue: 'NA'},
  country: {name: 'oxygen-buyer-country', defaultValue: 'US'},
  region: {name: 'oxygen-buyer-region', defaultValue: 'California'},
  regionCode: {name: 'oxygen-buyer-region-code', defaultValue: 'CA'},
  city: {name: 'oxygen-buyer-city', defaultValue: 'San Francisco'},
  isEuCountry: {name: 'oxygen-buyer-is-eu-country', defaultValue: ''},
  timezone: {
    name: 'oxygen-buyer-timezone',
    defaultValue: 'America/Los_Angeles',
  },

  // Not documented but available in Oxygen:
  deploymentId: {name: 'oxygen-buyer-deployment-id', defaultValue: 'local'},
  shopId: {name: 'oxygen-buyer-shop-id', defaultValue: 'development'},
  storefrontId: {
    name: 'oxygen-buyer-storefront-id',
    defaultValue: 'development',
  },
} as const;
