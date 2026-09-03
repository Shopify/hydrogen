import { extractHeaders } from "../../headers";
import { getLogger } from "../../logging";
import type { HydrogenRouteInterceptor, HydrogenRoutesOptions } from "../route-types";

const PROXY_TIMEOUT_MS = 30_000;

// Proxy errors are transient and may be buyer-specific: never cache them.
const PROXY_ERROR_CACHE_CONTROL = "no-store";

type PrepareHeaders = (headers: Headers, options: HydrogenRoutesOptions, url: URL) => void;

type ProxyRequestHeaderOptions = (
  | { allow: readonly string[]; deny?: never }
  | { allow?: never; deny: readonly string[] }
) & {
  prepare?: PrepareHeaders;
};

type ProxyResponseHeaderOptions = {
  prepare?: PrepareHeaders;
};

type ProxyDescriptor = {
  match: RegExp;
  methods?: readonly string[];
  formatError?: (message: string) => unknown;
  redirect?: RequestRedirect;
  scope: string;
  timeoutMs?: number;
  rewritePathname?: (pathname: string) => string;
  requestHeaders: ProxyRequestHeaderOptions;
  responseHeaders?: ProxyResponseHeaderOptions;
};

export function createProxyInterceptor(descriptor: ProxyDescriptor): HydrogenRouteInterceptor {
  const log = getLogger(descriptor.scope);
  const formatError = descriptor.formatError ?? defaultFormatError;

  return (url, options) => {
    const { request, storefrontClient } = options;
    if (!descriptor.match.test(url.pathname)) return null;
    if (descriptor.methods && !descriptor.methods.includes(request.method)) {
      // Method not allowed. Shape the body via formatError, like other errors.
      return Promise.resolve(
        new Response(JSON.stringify(formatError("Method Not Allowed")), {
          status: 405,
          headers: {
            allow: descriptor.methods.join(", "),
            "content-type": "application/json",
            "cache-control": PROXY_ERROR_CACHE_CONTROL,
          },
        }),
      );
    }

    let upstreamUrl: URL;
    let init: RequestInit & { duplex?: "half" };
    try {
      const upstreamPathname = descriptor.rewritePathname?.(url.pathname) ?? url.pathname;
      upstreamUrl = new URL(upstreamPathname + url.search, storefrontClient.storeUrl);

      init = {
        method: request.method,
        body: request.body,
        headers: createProxyRequestHeaders(descriptor, options, url),
        signal: AbortSignal.timeout(descriptor.timeoutMs ?? PROXY_TIMEOUT_MS),
        redirect: descriptor.redirect ?? "manual",
      };

      // Node's fetch requires this when forwarding a streaming request body.
      if (request.body) init.duplex = "half";
    } catch (error) {
      log.error("request failed", { error });
      return Promise.resolve(createProxyErrorResponse(error, 500, formatError));
    }

    return fetch(upstreamUrl, init)
      .then((upstreamResponse) => {
        const headers = createProxyResponseHeaders(upstreamResponse.headers);
        descriptor.responseHeaders?.prepare?.(headers, options, url);
        options.requestContext.consumeStorefrontResponseHeaders(headers);

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers,
        });
      })
      .catch((error) => {
        log.error("request failed", { error });
        return createProxyErrorResponse(error, 502, formatError);
      });
  };
}

function defaultFormatError(message: string): { error: string } {
  return { error: message };
}

function createProxyErrorResponse(
  error: unknown,
  status: number,
  formatError: (message: string) => unknown,
): Response {
  const message = error instanceof Error ? error.message : "Internal proxy error";
  return new Response(JSON.stringify(formatError(message)), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": PROXY_ERROR_CACHE_CONTROL,
    },
  });
}

function createProxyRequestHeaders(
  descriptor: ProxyDescriptor,
  options: HydrogenRoutesOptions,
  url: URL,
): Headers {
  const { request, requestContext } = options;
  const { allow, deny, prepare } = descriptor.requestHeaders;
  const headers = allow
    ? new Headers(extractHeaders((key) => request.headers.get(key), allow))
    : new Headers(request.headers);

  requestContext.applyStorefrontRequestHeaders(headers);

  for (const header of deny ?? []) headers.delete(header);
  prepare?.(headers, options, url);

  return headers;
}

export function createProxyResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return headers;
}
