import {output, path, file} from '@shopify/cli-kit';
import colors from '@shopify/cli-kit/node/colors';

type MiniOxygenOptions = {
  root: string;
  port?: number;
  watch?: boolean;
  autoReload?: boolean;
  buildPathClient: string;
  buildPathWorkerFile: string;
};

export async function startMiniOxygen({
  root,
  port = 3000,
  watch = false,
  autoReload = watch,
  buildPathWorkerFile,
  buildPathClient,
}: MiniOxygenOptions) {
  const {default: miniOxygen} = await import('@shopify/mini-oxygen');
  const miniOxygenPreview =
    miniOxygen.default ?? (miniOxygen as unknown as typeof miniOxygen.default);

  const dotenvPath = path.resolve(root, '.env');

  const {port: actualPort} = await miniOxygenPreview({
    workerFile: buildPathWorkerFile,
    assetsDir: buildPathClient,
    publicPath: '',
    port,
    watch,
    autoReload,
    modules: true,
    env: process.env,
    envPath: (await file.exists(dotenvPath)) ? dotenvPath : undefined,
    log: () => {},
    onResponse: (request, response) =>
      // 'Request' and 'Response' types in MiniOxygen comes from
      // Miniflare and are slightly different from standard types.
      logResponse(
        request as unknown as Request,
        response as unknown as Response,
      ),
  });

  const listeningAt = `http://localhost:${actualPort}`;

  output.info(
    output.content`🚥 MiniOxygen server started at ${output.token.link(
      listeningAt,
      listeningAt,
    )}\n`,
  );
}

export function logResponse(request: Request, response: Response) {
  try {
    const url = new URL(request.url);
    if (['/graphiql', '/__REMIX_ASSETS_MANIFEST'].includes(url.pathname)) {
      return;
    }

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
        ? output.token.green
        : response.status < 400
        ? output.token.cyan
        : output.token.errorText;

    output.info(
      output.content`${request.method.padStart(6)}  ${colorizeStatus(
        String(response.status),
      )}  ${output.token.italic(type.padEnd(7, ' '))} ${route}${
        info ? ' ' + colors.dim(info) : ''
      } ${
        request.headers.get('purpose') === 'prefetch'
          ? output.token.italic('(prefetch)')
          : ''
      }`,
    );
  } catch {
    if (request && response) {
      output.info(`${request.method} ${response.status} ${request.url}`);
    }
  }
}
