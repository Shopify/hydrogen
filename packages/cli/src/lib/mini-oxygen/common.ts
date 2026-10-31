import {
  outputInfo,
  outputToken,
  outputContent,
} from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import {DEV_ROUTES} from '../request-events.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import type {RequestHookInfo} from '~/mini-oxygen/worker/handler.js';

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
  {request, response, meta}: RequestHookInfo,
  write: typeof outputInfo = outputInfo,
  {preserveQuery = false}: {preserveQuery?: boolean} = {},
): void | Promise<void> {
  try {
    const url = new URL(request.url);
    // Calculate durationMs if not provided
    if (!meta.durationMs && meta.startTimeMs && meta.endTimeMs) {
      meta.durationMs = meta.endTimeMs - meta.startTimeMs;
    }
    if (DEV_ROUTES.has(url.pathname) || url.pathname === '/favicon.ico') return;

    const isDataRequest = url.searchParams.has('_data');
    let route = request.url.replace(url.origin, '');
    let info = '';
    let type = 'render';

    if (isDataRequest) {
      type = request.method === 'GET' ? 'loader' : 'action';
      const dataParam = url.searchParams.get('_data')?.replace('routes/', '');
      if (!preserveQuery) route = url.pathname;
      info = `[${dataParam}]`;
    }

    const colorizeStatus =
      response.status < 300
        ? outputToken.green
        : response.status < 400
          ? outputToken.cyan
          : outputToken.errorText;

    write(
      outputContent`${request.method.padStart(6)}  ${colorizeStatus(
        String(response.status),
      )}  ${outputToken.italic(type.padEnd(7, ' '))} ${route} ${
        meta.durationMs && meta.durationMs > 0
          ? colors.dim(` ${meta.durationMs}ms`)
          : ''
      }${info ? '  ' + colors.dim(info) : ''}${
        request.headers.purpose === 'prefetch'
          ? colors.italic(colors.dim('  prefetch'))
          : ''
      }`,
    );
  } catch {
    if (request && response?.status) {
      write(`${request.method} ${response.status} ${request.url}`);
    }
  }
}
