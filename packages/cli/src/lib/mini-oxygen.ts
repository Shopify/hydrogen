import {
  outputInfo,
  outputToken,
  outputContent,
} from '@shopify/cli-kit/node/output';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {colors} from './colors.js';

type MiniOxygenOptions = {
  root: string;
  port?: number;
  watch?: boolean;
  buildPathClient: string;
  buildPathWorkerFile: string;
};

export async function startMiniOxygen({
  root,
  port = 3000,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
}: MiniOxygenOptions) {
  const {default: miniOxygen} = await import('@shopify/mini-oxygen');
  const miniOxygenPreview =
    miniOxygen.default ?? (miniOxygen as unknown as typeof miniOxygen.default);

  const dotenvPath = resolvePath(root, '.env');

  const {port: actualPort} = await miniOxygenPreview({
    workerFile: buildPathWorkerFile,
    assetsDir: buildPathClient,
    publicPath: '',
    port,
    watch,
    autoReload: watch,
    modules: true,
    env: process.env,
    envPath: (await fileExists(dotenvPath)) ? dotenvPath : undefined,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    log: () => {},
    buildWatchPaths: watch
      ? [resolvePath(root, buildPathWorkerFile)]
      : undefined,
    onResponse: (request, response) =>
      // 'Request' and 'Response' types in MiniOxygen comes from
      // Miniflare and are slightly different from standard types.
      logResponse(
        request as unknown as Request,
        response as unknown as Response,
      ),
  });

  const listeningAt = `http://localhost:${actualPort}`;

  outputInfo(
    outputContent`🚥 MiniOxygen server started at ${outputToken.link(
      listeningAt,
      listeningAt,
    )}\n`,
  );
}

export function logResponse(request: Request, response: Response) {
  try {
    const url = new URL(request.url);
    if (['/graphiql'].includes(url.pathname)) return;

    const isProxy = !!response.url && response.url !== request.url;
    const isDataRequest = !isProxy && url.searchParams.has('_data');
    let route = request.url.replace(url.origin, '');
    let info = '';
    let type = 'render';

    if (isProxy) {
      type = 'proxy';
      info = `[${response.url}]`;
    }

    if (isDataRequest) {
      type = request.method === 'GET' ? 'loader' : 'action';
      const dataParam = url.searchParams.get('_data')?.replace('routes/', '');
      route = url.pathname;
      info = `[${dataParam}]`;
    }

    const colorizeStatus =
      response.status < 300
        ? outputToken.green
        : response.status < 400
        ? outputToken.cyan
        : outputToken.errorText;

    outputInfo(
      outputContent`${request.method.padStart(6)}  ${colorizeStatus(
        String(response.status),
      )}  ${outputToken.italic(type.padEnd(7, ' '))} ${route}${
        info ? ' ' + colors.dim(info) : ''
      } ${
        request.headers.get('purpose') === 'prefetch'
          ? outputToken.italic('(prefetch)')
          : ''
      }`,
    );
  } catch {
    if (request && response) {
      outputInfo(`${request.method} ${response.status} ${request.url}`);
    }
  }
}
