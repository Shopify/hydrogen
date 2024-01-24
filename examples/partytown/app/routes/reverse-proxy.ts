// Reverse proxies partytown libs that require CORS. Used by Partytown resolveUrl
//@see: https://developers.cloudflare.com/workers/examples/cors-header-proxy/

import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';

type HandleRequestResponHeaders = {
  'Access-Control-Allow-Origin': string;
  Vary: string;
  'cache-control'?: string;
  'content-type'?: string;
};

type CorsHeaders = {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Max-Age': string;
  'Access-Control-Allow-Headers'?: string;
};

const ALLOWED_PROXY_DOMAINS = new Set([
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://google-analytics.com',
  // other domains you may want to allow to proxy to
]);

// Handle CORS preflight for POST requests
export async function actions({request}: ActionFunctionArgs) {
  const url = new URL(request.url);
  const isProxyReq = url.pathname.startsWith('/reverse-proxy');

  if (!isProxyReq) {
    return handleErrorResponse({
      status: 405,
      statusText: 'Only proxy requests allowed',
    });
  }

  if (request.method === 'OPTIONS') {
    return handleCorsOptions(request);
  } else if (request.method === 'HEAD' || request.method === 'POST') {
    return handleRequest(request);
  } else {
    return handleErrorResponse({
      status: 405,
      statusText: 'Method Not Allowed',
    });
  }
}

// Handle CORS preflight for GET requests
export function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const isProxyReq = url.pathname.startsWith('/reverse-proxy');

  if (!isProxyReq) {
    return handleErrorResponse({
      status: 405,
      statusText: 'Only proxy requests allowed',
    });
  }

  if (request.method === 'OPTIONS') {
    return handleCorsOptions(request);
  } else if (request.method === 'HEAD' || request.method === 'GET') {
    return handleRequest(request);
  } else {
    return handleErrorResponse({
      status: 405,
      statusText: 'Method Not Allowed',
    });
  }
}

/**
 * Handle error responses
 * @param status - the status code
 * @param statusText - the status text
 * @returns Response
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 */
function handleErrorResponse({
  status,
  statusText,
}: {
  status: number;
  statusText: string;
}) {
  return new Response(null, {
    status,
    statusText,
  });
}

/*
 * Handle CORS preflight requests
 * @param request - the request object
 * @returns Response
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers
 */
function handleCorsOptions(request: LoaderFunctionArgs['request']) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  const headers = request.headers;

  const requiredHeaders =
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null;

  if (!requiredHeaders) {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }

  const corsHeaders: CorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  const haveAcessControlHeaders =
    request.headers.get('Access-Control-Request-Headers') != null;

  const accessControl = request.headers.get(
    'Access-Control-Request-Headers',
  ) as string;

  // Allow all future content Request headers to go back to the browser
  // such as Authorization (Bearer) or X-Client-Name-Version
  if (haveAcessControlHeaders) {
    corsHeaders['Access-Control-Allow-Headers'] = accessControl;
  }

  return new Response(null, {
    headers: corsHeaders,
  });
}

/**
 * Handle non CORS preflight requests
 * @param request - the request object
 * @returns Response
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 */
async function handleRequest(request: LoaderFunctionArgs['request']) {
  const url = new URL(request.url);
  let apiUrl = url.searchParams.get('apiUrl');

  if (apiUrl == null) {
    apiUrl = request.url;
  }

  const apiUrlObj = new URL(apiUrl);

  if (!ALLOWED_PROXY_DOMAINS.has(apiUrlObj.origin)) {
    return handleErrorResponse({
      status: 403,
      statusText: 'Forbidden',
    });
  }

  try {
    // fetch the requested resource
    const response = await fetch(apiUrl);

    const respHeaders: HandleRequestResponHeaders = {
      'Access-Control-Allow-Origin': url.origin,
      Vary: 'Origin', // Append to/Add Vary header so browser will cache response correctly
    };

    if (response.headers.has('content-type')) {
      respHeaders['content-type'] = response.headers.get(
        'content-type',
      ) as string;
    }

    if (response.headers.has('cache-control')) {
      respHeaders['cache-control'] = response.headers.get(
        'cache-control',
      ) as string;
    }

    return new Response(response.body, {
      headers: respHeaders,
      status: 200,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return handleErrorResponse({
        status: 404,
        statusText: error.message,
      });
    }
  }
}
