import { extractHeaders } from "../../headers";
import { getLogger } from "../../logging";
import type { HydrogenRouteInterceptor, HydrogenRoutesOptions } from "../route-types";

const PROXY_TIMEOUT_MS = 30_000;

type ScopedLogger = ReturnType<typeof getLogger>;

type PrepareHeaders = (headers: Headers, options: HydrogenRoutesOptions, url: URL) => void;

type ProxyRequestHeaderOptions = (
  | { allow: readonly string[]; deny?: never }
  | { allow?: never; deny: readonly string[] }
) & {
  prepare?: PrepareHeaders;

  applyStorefrontHeaders?: boolean;
};

type ProxyUpstreamInfo = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
};

type ProxyResponseHeaderMode = "forward" | { allow: readonly string[] };

type ProxyResponseHeaderInjector = (
  upstream: ProxyUpstreamInfo,
  options: HydrogenRoutesOptions,
  url: URL,
) => Record<string, string> | void;

type ProxyResponseHeaderOptions = {
  mode?: ProxyResponseHeaderMode;
  inject?: ProxyResponseHeaderInjector;
  prepare?: PrepareHeaders;
  consumeStorefrontHeaders?: boolean;
};

type ProxyResponseRejection = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  logMessage?: string;
  log?: Record<string, unknown>;
};

type ProxyResponseValidation = (
  upstream: ProxyUpstreamInfo,
  options: HydrogenRoutesOptions,
  url: URL,
) => ProxyResponseRejection | null;

type ProxyErrorPhase = "setup" | "fetch";

type ProxyErrorMapping = { status?: number; headers?: Record<string, string> };

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
    if (descriptor.methods && !descriptor.methods.includes(request.method)) return null;

    let requestInit: ProxyRequestInit;
    try {
      requestInit = createProxyRequestInit(descriptor, options, url);
    } catch (error) {
      log.error("request failed", { error });
      return Promise.resolve(
        createProxyErrorResponse(error, "setup", descriptor.mapError, formatError),
      );
    }

    return fetch(requestInit.upstreamUrl, requestInit.init)
      .then((upstreamResponse) =>
        buildProxyResponse(upstreamResponse, descriptor, options, url, log),
      )
      .catch((error) => {
        log.error("request failed", { error });
        return createProxyErrorResponse(error, "fetch", descriptor.mapError, formatError);
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
  const headers = createProxyRequestHeaders(descriptor, request);
  if (descriptor.requestHeaders.applyStorefrontHeaders !== false) {
    options.requestContext.applyStorefrontRequestHeaders(headers);
  }
  descriptor.requestHeaders.prepare?.(headers, options, url);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    body: request.body,
    headers,
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
    return createProxyRejectionResponse(rejection);
  }

  const headers = buildProxyResponseHeaders(
    upstreamResponse.headers,
    descriptor.responseHeaders?.mode,
  );
  applyProxyResponseHeaders(headers, upstream, descriptor, options, url);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

function applyProxyResponseHeaders(
  headers: Headers,
  upstream: ProxyUpstreamInfo,
  descriptor: ProxyDescriptor,
  options: HydrogenRoutesOptions,
  url: URL,
): void {
  const injected = descriptor.responseHeaders?.inject?.(upstream, options, url);
  if (injected) {
    for (const [name, value] of Object.entries(injected)) headers.set(name, value);
  }
  descriptor.responseHeaders?.prepare?.(headers, options, url);
  if (descriptor.responseHeaders?.consumeStorefrontHeaders !== false) {
    options.requestContext.consumeStorefrontResponseHeaders(headers);
  }
}

function defaultFormatError(message: string): { error: string } {
  return { error: message };
}

function createProxyErrorResponse(
  error: unknown,
  phase: ProxyErrorPhase,
  mapError: MapProxyError | undefined,
  formatError: (message: string) => unknown,
): Response {
  const message = error instanceof Error ? error.message : "Internal proxy error";
  const mapping = mapError?.(error, phase);
  const status = mapping?.status ?? (phase === "setup" ? 500 : 502);
  return new Response(JSON.stringify(formatError(message)), {
    status,
    headers: { "content-type": "application/json", ...mapping?.headers },
  });
}

function createProxyRejectionResponse(rejection: ProxyResponseRejection): Response {
  return new Response(JSON.stringify(rejection.body), {
    status: rejection.status,
    headers: { "content-type": "application/json", ...rejection.headers },
  });
}

function createProxyRequestHeaders(descriptor: ProxyDescriptor, request: Request): Headers {
  const { allow, deny } = descriptor.requestHeaders;
  const headers = allow
    ? new Headers(extractHeaders((key) => request.headers.get(key), allow))
    : new Headers(request.headers);
  for (const header of deny ?? []) headers.delete(header);
  return headers;
}

function buildProxyResponseHeaders(
  upstreamHeaders: Headers,
  mode?: ProxyResponseHeaderMode,
): Headers {
  if (mode && mode !== "forward") {
    const headers = new Headers();
    for (const name of mode.allow) {
      const value = upstreamHeaders.get(name);

      if (value) headers.set(name, value);
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
