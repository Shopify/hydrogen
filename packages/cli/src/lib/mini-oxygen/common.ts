import {
  outputInfo,
  outputToken,
  outputContent,
} from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import {DEV_ROUTES} from '../request-events.js';
import {AbortError} from '@shopify/cli-kit/node/error';

// Default port used for debugging in VSCode and Chrome DevTools.
export const DEFAULT_INSPECTOR_PORT = 9229;

export const SUBREQUEST_PROFILER_ENDPOINT = '/debug-network-server';

export function handleMiniOxygenImportFail(): never {
  throw new AbortError(
    'Could not load MiniOxygen.',
    'Please make sure you have `@shopify/mini-oxygen` installed.',
  );
}

export function logRequestLine(
  // Minimal overlap between Fetch, Miniflare@2 and Miniflare@3 request types.
  request: Pick<Request, 'method' | 'url'> & {
    headers: {get: (key: string) => string | null};
  },
  {
    responseStatus = 200,
    durationMs = 0,
  }: {responseStatus?: number; durationMs?: number} = {},
): void {
  try {
    const url = new URL(request.url);
    if (DEV_ROUTES.has(url.pathname) || url.pathname === '/favicon.ico') return;

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
}
