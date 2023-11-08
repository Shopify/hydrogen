import {
  outputInfo,
  outputToken,
  outputContent,
} from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import {DEV_ROUTES} from '../request-events.js';

export const DEFAULT_INSPECTOR_PORT = 9222;

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
    if (DEV_ROUTES.has(url.pathname)) return;

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

// https://shopify.dev/docs/custom-storefronts/oxygen/worker-runtime-apis#custom-headers
export const OXYGEN_HEADERS_MAP = {
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
