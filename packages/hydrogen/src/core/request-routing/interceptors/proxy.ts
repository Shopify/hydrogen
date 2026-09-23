import { extractHeaders } from "../../headers";
import { getLogger } from "../../logging";
import type { HydrogenRouteInterceptor, HydrogenRoutesOptions } from "../route-types";

const PROXY_TIMEOUT_MS = 30_000;

// Proxy errors are transient and may be buyer-specific: never cache them.
const PROXY_ERROR_CACHE_CONTROL = "no-store";

type ScopedLogger = ReturnType<typeof getLogger>;

type PrepareRequestHeaders = (headers: Headers, options: HydrogenRoutesOptions, url: URL) => void;

type ProxyRequestHeaderOptions = (
  | { allow: readonly string[]; deny?: never }
  | { allow?: never; deny: readonly string[] }
) & {
  prepare?: PrepareRequestHeaders;
  applyStorefrontHeaders?: boolean;
};

type ProxyUpstreamInfo = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
};

type PrepareResponseHeaders = (
  headers: Headers,
  upstream: ProxyUpstreamInfo,
  options: HydrogenRoutesOptions,
  url: URL,
) => void;

type ProxyResponseHeaderOptions = {
  allow?: readonly string[];
  prepare?: PrepareResponseHeaders;
};

type ProxyResponseRejection = {
  status: number;
  body: unknown;
  logMessage?: string;
  log?: Record<string, unknown>;
};

type ProxyResponseValidation = (
  upstream: ProxyUpstreamInfo,
  options: HydrogenRoutesOptions,
  url: URL,
) => ProxyResponseRejection | null;

type ProxyErrorPhase = "setup" | "fetch";

type ProxyErrorMapping = { status?: number; body?: unknown };

type MapProxyError = (error: unknown, phase: ProxyErrorPhase) => ProxyErrorMapping;

type ProxyDescriptor = {
  match: RegExp;
  methods?: readonly string[];
  formatError?: (message: string) => unknown;
  redirect?: RequestRedirect;
  scope: string;
  timeoutMs?: number;
  forwardSearch?: boolean;
  rewritePathname?: (pathname: string) => string;
  requestHeaders: ProxyRequestHeaderOptions;
  responseHeaders?: ProxyResponseHeaderOptions;
  responseValidation?: ProxyResponseValidation;
  mapError?: MapProxyError;
};

type ProxyRequestInit = { upstreamUrl: URL; init: RequestInit & { duplex?: "half" } };

export function createProxyInterceptor(descriptor: ProxyDescriptor): HydrogenRouteInterceptor {
  const log = getLogger(descriptor.scope);
  const formatError = descriptor.formatError ?? defaultFormatError;

  return (url, options) => {
    const { request } = options;
    if (!descriptor.match.test(url.pathname)) return null;
    if (descriptor.methods && !descriptor.methods.includes(request.method)) {
      // Method not allowed. Shape the body via formatError, like other errors.
      return Promise.resolve(
        new Response(
          request.method === "HEAD" ? null : JSON.stringify(formatError("Method Not Allowed")),
          {
            status: 405,
            headers: {
              allow: descriptor.methods.join(", "),
              "content-type": "application/json",
              "cache-control": PROXY_ERROR_CACHE_CONTROL,
            },
          },
        ),
      );
    }

    let requestInit: ProxyRequestInit;
    try {
      requestInit = createProxyRequestInit(descriptor, options, url);
    } catch (error) {
      log.error("request failed", { error });
      return Promise.resolve(
        createProxyErrorResponse(error, "setup", descriptor.mapError, formatError, request.method),
      );
    }

    return fetch(requestInit.upstreamUrl, requestInit.init)
      .then((upstreamResponse) =>
        buildProxyResponse(upstreamResponse, descriptor, options, url, log),
      )
      .catch((error) => {
        log.error("request failed", { error });
        return createProxyErrorResponse(
          error,
          "fetch",
          descriptor.mapError,
          formatError,
          request.method,
        );
      });
  };
}

function createProxyRequestInit(
  descriptor: ProxyDescriptor,
  options: HydrogenRoutesOptions,
  url: URL,
): ProxyRequestInit {
  const { request, storefrontClient } = options;
  const upstreamPathname = descriptor.rewritePathname?.(url.pathname) ?? url.pathname;
  const search = descriptor.forwardSearch === false ? "" : url.search;
  const upstreamUrl = new URL(upstreamPathname + search, storefrontClient.storeUrl);
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    body: request.body,
    headers: createProxyRequestHeaders(descriptor, options, url),
    signal: AbortSignal.timeout(descriptor.timeoutMs ?? PROXY_TIMEOUT_MS),
    redirect: descriptor.redirect ?? "manual",
  };

  // Node's fetch requires this when forwarding a streaming request body.
  if (request.body) init.duplex = "half";
  return { upstreamUrl, init };
}

function buildProxyResponse(
  upstreamResponse: Response,
  descriptor: ProxyDescriptor,
  options: HydrogenRoutesOptions,
  url: URL,
  log: ScopedLogger,
): Response {
  const upstream: ProxyUpstreamInfo = {
    ok: upstreamResponse.ok,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  };

  const rejection = descriptor.responseValidation?.(upstream, options, url);
  if (rejection) {
    // Centralized drain: response hooks receive only a body-less view, so the factory
    // owns the sole cancellation and no validator can leak the upstream connection.
    upstreamResponse.body?.cancel().catch(() => {});
    if (rejection.logMessage) log.error(rejection.logMessage, rejection.log ?? {});
    return createProxyRejectionResponse(rejection, options.request.method);
  }

  const headers = buildProxyResponseHeaders(
    upstreamResponse.headers,
    descriptor.responseHeaders?.allow,
  );
  descriptor.responseHeaders?.prepare?.(headers, upstream, options, url);
  options.requestContext.consumeStorefrontResponseHeaders(headers);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

function defaultFormatError(message: string): { error: string } {
  return { error: message };
}

function createProxyErrorResponse(
  error: unknown,
  phase: ProxyErrorPhase,
  mapError: MapProxyError | undefined,
  formatError: (message: string) => unknown,
  method: string,
): Response {
  const message = error instanceof Error ? error.message : "Internal proxy error";
  const mapping = mapError?.(error, phase);
  const status = mapping?.status ?? (phase === "setup" ? 500 : 502);
  const body = mapping?.body === undefined ? formatError(message) : mapping.body;
  return createProxyRejectionResponse({ status, body }, method);
}

function createProxyRejectionResponse(rejection: ProxyResponseRejection, method: string): Response {
  return new Response(method === "HEAD" ? null : JSON.stringify(rejection.body), {
    status: rejection.status,
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

  if (descriptor.requestHeaders.applyStorefrontHeaders !== false) {
    requestContext.applyStorefrontRequestHeaders(headers);
  }

  for (const header of deny ?? []) headers.delete(header);
  prepare?.(headers, options, url);

  return headers;
}

function buildProxyResponseHeaders(upstreamHeaders: Headers, allow?: readonly string[]): Headers {
  if (allow) {
    const headers = new Headers();
    for (const name of allow) {
      const value = upstreamHeaders.get(name);
      if (value !== null) headers.set(name, value);
    }
    return headers;
  }
  return createProxyResponseHeaders(upstreamHeaders);
}

export function createProxyResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return headers;
}
