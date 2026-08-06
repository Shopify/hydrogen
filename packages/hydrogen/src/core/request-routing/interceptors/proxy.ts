import { extractHeaders, REQUEST_GROUP_ID_HEADER } from "../../headers";
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
  formatError?: (message: string) => unknown;
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

    const upstreamPathname = descriptor.rewritePathname?.(url.pathname) ?? url.pathname;
    const upstreamUrl = new URL(upstreamPathname + url.search, storefrontClient.storeUrl);

    const forwardedHeaders = createProxyRequestHeaders(descriptor, request);
    descriptor.headers.prepare?.(forwardedHeaders, options, url);

    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      body: request.body,
      headers: forwardedHeaders,
      signal: AbortSignal.timeout(descriptor.timeoutMs ?? PROXY_TIMEOUT_MS),
      redirect: "manual",
    };

    // Node's fetch requires this when forwarding a streaming request body.
    if (request.body) init.duplex = "half";

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
        const message = error instanceof Error ? error.message : "Internal proxy error";

        return new Response(JSON.stringify(formatError(message)), {
          status: 502,
          headers: { "content-type": "application/json" },
        });
      });
  };
}

function defaultFormatError(message: string): { error: string } {
  return { error: message };
}

function createProxyRequestHeaders(descriptor: ProxyDescriptor, request: Request): Headers {
  const { allow, deny } = descriptor.headers;
  const headers = allow
    ? new Headers(extractHeaders((key) => request.headers.get(key), allow))
    : new Headers(request.headers);
  for (const header of deny ?? []) headers.delete(header);
  headers.set(
    REQUEST_GROUP_ID_HEADER,
    request.headers.get(REQUEST_GROUP_ID_HEADER) ??
      request.headers.get("x-request-id") ??
      request.headers.get("request-id") ??
      crypto.randomUUID(),
  );
  return headers;
}

export function createProxyResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return headers;
}
