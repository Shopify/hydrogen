import type { HydrogenRoutesOptions } from "../handle-shopify-routes";
import { extractHeaders, REQUEST_GROUP_ID_HEADER } from "../headers";

const PROXY_TIMEOUT_MS = 30_000;

type ProxyDescriptor = {
  match: RegExp;
  allowlist: readonly string[];
  formatError: (message: string) => unknown;
  logPrefix: string;
  timeoutMs?: number;
  prepareHeaders?: (headers: Headers, options: HydrogenRoutesOptions) => void;
};

export function createProxyInterceptor(descriptor: ProxyDescriptor) {
  return async (options: HydrogenRoutesOptions): Promise<Response | null> => {
    const { request, storefrontClient } = options;
    const url = new URL(request.url);
    if (!descriptor.match.test(url.pathname)) return null;

    const upstreamUrl = new URL(url.pathname + url.search, storefrontClient.storeUrl);

    const forwardedHeaders = new Headers(
      extractHeaders((key) => request.headers.get(key), descriptor.allowlist),
    );
    forwardedHeaders.set(
      REQUEST_GROUP_ID_HEADER,
      request.headers.get(REQUEST_GROUP_ID_HEADER) ??
        request.headers.get("x-request-id") ??
        request.headers.get("request-id") ??
        crypto.randomUUID(),
    );
    descriptor.prepareHeaders?.(forwardedHeaders, options);

    try {
      const init: RequestInit & { duplex?: "half" } = {
        method: request.method,
        body: request.body,
        headers: forwardedHeaders,
        signal: AbortSignal.timeout(descriptor.timeoutMs ?? PROXY_TIMEOUT_MS),
        redirect: "manual",
      };

      // Node's fetch requires this when forwarding a streaming request body.
      if (request.body) init.duplex = "half";

      const upstreamResponse = await fetch(upstreamUrl, init);

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: createProxyResponseHeaders(upstreamResponse.headers),
      });
    } catch (error) {
      console.error(`${descriptor.logPrefix} request failed:`, error);
      const message = error instanceof Error ? error.message : "Internal proxy error";

      return new Response(JSON.stringify(descriptor.formatError(message)), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }
  };
}

export function createProxyResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return headers;
}
