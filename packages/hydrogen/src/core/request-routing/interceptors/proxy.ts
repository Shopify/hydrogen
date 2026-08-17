import { extractHeaders } from "../../headers";
import { getLogger } from "../../logging";
import type { HydrogenRouteInterceptor, HydrogenRoutesOptions } from "../route-types";

const PROXY_TIMEOUT_MS = 30_000;

type ProxyHeaderOptions = (
  | { allow: readonly string[]; deny?: never }
  | { allow?: never; deny: readonly string[] }
) & {
  prepare?: (headers: Headers, options: HydrogenRoutesOptions, url: URL) => void;
};

type ProxyDescriptor = {
  headers: ProxyHeaderOptions;
  match: RegExp;
  methods?: readonly string[];
  formatError?: (message: string) => unknown;
  redirect?: RequestRedirect;
  scope: string;
  timeoutMs?: number;
  rewritePathname?: (pathname: string) => string;
};

export function createProxyInterceptor(descriptor: ProxyDescriptor): HydrogenRouteInterceptor {
  const log = getLogger(descriptor.scope);
  const formatError = descriptor.formatError ?? defaultFormatError;

  return (url, options) => {
    const { request, storefrontClient } = options;
    if (!descriptor.match.test(url.pathname)) return null;
    if (descriptor.methods && !descriptor.methods.includes(request.method)) return null;

    let upstreamUrl: URL;
    let init: RequestInit & { duplex?: "half" };
    try {
      const upstreamPathname = descriptor.rewritePathname?.(url.pathname) ?? url.pathname;
      upstreamUrl = new URL(upstreamPathname + url.search, storefrontClient.storeUrl);
      const forwardedHeaders = createProxyRequestHeaders(descriptor, request);
      options.requestContext.applyStorefrontRequestHeaders(forwardedHeaders);
      descriptor.headers.prepare?.(forwardedHeaders, options, url);

      init = {
        method: request.method,
        body: request.body,
        headers: forwardedHeaders,
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
      .then(
        (upstreamResponse) =>
          new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: createProxyResponseHeaders(upstreamResponse.headers),
          }),
      )
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
    headers: { "content-type": "application/json" },
  });
}

function createProxyRequestHeaders(descriptor: ProxyDescriptor, request: Request): Headers {
  const { allow, deny } = descriptor.headers;
  const headers = allow
    ? new Headers(extractHeaders((key) => request.headers.get(key), allow))
    : new Headers(request.headers);
  for (const header of deny ?? []) headers.delete(header);
  return headers;
}

export function createProxyResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return headers;
}
