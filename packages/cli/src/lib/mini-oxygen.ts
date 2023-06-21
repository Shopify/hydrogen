import {
  outputInfo,
  outputToken,
  outputContent,
} from '@shopify/cli-kit/node/output';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {fileExists, writeFile} from '@shopify/cli-kit/node/fs';
import colors from '@shopify/cli-kit/node/colors';
import type {Request, Response} from '@shopify/mini-oxygen';
import {startProfiler} from './profiling.js';

type MiniOxygenOptions = {
  root: string;
  port?: number;
  watch?: boolean;
  buildPathClient: string;
  buildPathWorkerFile: string;
  environmentVariables?: {[key: string]: string};
  profiling?: boolean;
};

export async function startMiniOxygen({
  root,
  port = 3000,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  environmentVariables = {},
  profiling = true,
}: MiniOxygenOptions) {
  const {createMiniOxygen} = await import('@shopify/mini-oxygen');

  const dotenvPath = resolvePath(root, '.env');

  const miniOxygenOptions = {
    workDir: root,
    workerFile: buildPathWorkerFile,
    watch,
    modules: true,
    env: {
      ...environmentVariables,
      ...process.env,
    },
    envPath:
      !Object.keys(environmentVariables).length &&
      (await fileExists(dotenvPath))
        ? dotenvPath
        : undefined,
    log: () => {},
    buildWatchPaths: watch
      ? [resolvePath(root, buildPathWorkerFile)]
      : undefined,
  };

  const stopProfiler = profiling && (await startProfiler());

  const miniOxygen = createMiniOxygen(miniOxygenOptions);

  if (stopProfiler) {
    await miniOxygen.init();
    const profile = await stopProfiler();
    await writeFile('./profile.cpuprofile', JSON.stringify(profile));
  }

  const {port: actualPort} = await miniOxygen.createServer({
    port,
    assetsDir: buildPathClient,
    publicPath: '',
    autoReload: watch,
    onResponse: logResponse,
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
