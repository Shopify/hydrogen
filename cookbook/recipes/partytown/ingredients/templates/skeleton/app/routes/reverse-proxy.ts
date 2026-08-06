// Reverse proxies partytown libs that require CORS. Used by Partytown resolveUrl
//@see: https://developers.cloudflare.com/workers/examples/cors-header-proxy/

import type {Route} from './+types/reverse-proxy';

type ProxyResponseHeaders = {
  'Access-Control-Allow-Origin': string;
  'Content-Security-Policy': string;
  Vary: string;
  'X-Content-Type-Options': string;
  'cache-control'?: string;
  'content-type': string;
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
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  // other domains you may want to allow to proxy to
]);

const CORS_PREFLIGHT_MAX_AGE_IN_SECONDS = '86400';
const PROXY_CONTENT_SECURITY_POLICY =
  "default-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
const FORBIDDEN_STATUS = 403;
const MAX_PROXY_REDIRECTS = 3;
const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;

const ALLOWED_SCRIPT_CONTENT_TYPES = new Set([
  'application/ecmascript',
  'application/javascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
]);

const REDIRECT_RESPONSE_STATUSES = new Set([301, 302, 303, 307, 308]);

// Handle CORS preflight for POST requests
export async function action({request}: Route.ActionArgs) {
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
export function loader({request}: Route.LoaderArgs) {
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
function handleCorsOptions(request: Route.LoaderArgs['request']) {
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
    'Access-Control-Max-Age': CORS_PREFLIGHT_MAX_AGE_IN_SECONDS,
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
async function handleRequest(request: Route.LoaderArgs['request']) {
  const url = new URL(request.url);
  let apiUrl = url.searchParams.get('apiUrl');

  if (apiUrl == null) {
    apiUrl = request.url;
  }

  const apiUrlObj = new URL(apiUrl);

  if (!ALLOWED_PROXY_DOMAINS.has(apiUrlObj.origin)) {
    return handleErrorResponse({
      status: FORBIDDEN_STATUS,
      statusText: 'Forbidden',
    });
  }

  try {
    const response = await fetchAllowedProxyResponse(apiUrlObj);

    if (response == null) {
      return handleErrorResponse({
        status: FORBIDDEN_STATUS,
        statusText: 'Forbidden',
      });
    }

    const contentType = response.headers.get('content-type');

    if (!hasAllowedScriptContentType(contentType)) {
      return handleErrorResponse({
        status: UNSUPPORTED_MEDIA_TYPE_STATUS,
        statusText: 'Unsupported Media Type',
      });
    }

    const respHeaders: ProxyResponseHeaders = {
      'Access-Control-Allow-Origin': url.origin,
      'Content-Security-Policy': PROXY_CONTENT_SECURITY_POLICY,
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
      'content-type': contentType,
    };

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

async function fetchAllowedProxyResponse(apiUrlObj: URL) {
  let redirectCount = 0;
  let nextUrl = apiUrlObj;

  while (true) {
    const response = await fetch(nextUrl.href, {redirect: 'manual'});

    if (!isRedirectResponse(response)) {
      return response;
    }

    if (redirectCount >= MAX_PROXY_REDIRECTS) {
      return null;
    }

    const location = response.headers.get('location');
    if (location == null) {
      return null;
    }

    nextUrl = new URL(location, nextUrl);
    if (!ALLOWED_PROXY_DOMAINS.has(nextUrl.origin)) {
      return null;
    }

    redirectCount += 1;
  }
}

function hasAllowedScriptContentType(
  contentType: string | null,
): contentType is string {
  if (contentType == null) {
    return false;
  }

  const [mediaType] = contentType.split(';');

  return ALLOWED_SCRIPT_CONTENT_TYPES.has(mediaType.trim().toLowerCase());
}

function isRedirectResponse(response: Response) {
  return REDIRECT_RESPONSE_STATUSES.has(response.status);
}
