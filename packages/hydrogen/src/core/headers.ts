export const STOREFRONT_ACCESS_TOKEN_HEADER = "X-Shopify-Storefront-Access-Token";
export const STOREFRONT_PRIVATE_TOKEN_HEADER = "Shopify-Storefront-Private-Token";
export const REQUEST_GROUP_ID_HEADER = "Custom-Storefront-Request-Group-ID";
export const STOREFRONT_BUYER_IP_HEADER = "Shopify-Storefront-Buyer-IP";
export const SHOPIFY_CLIENT_IP_HEADER = "X-Shopify-Client-IP";
export const SHOPIFY_UNIQUE_TOKEN_HEADER = "X-Shopify-UniqueToken";
export const SHOPIFY_VISIT_TOKEN_HEADER = "X-Shopify-VisitToken";
export const SHOPIFY_STOREFRONT_Y_HEADER = "Shopify-Storefront-Y";
export const SHOPIFY_STOREFRONT_S_HEADER = "Shopify-Storefront-S";
export const SERVER_TIMING_HEADER = "Server-Timing";
export const STOREFRONT_URL_HEADER = "x-storefront-url";

const UNIQUE_TOKEN_MARKER = "_y";
const VISIT_TOKEN_MARKER = "_s";

declare global {
  // Keep request contexts nominal so callers use createStorefrontRequestContext(),
  // which owns hidden per-request lifecycle state like captured subrequest headers.
  const __hydrogenStorefrontRequestContextBrand: unique symbol;
}

export function extractHeaders(
  getter: (key: string) => string | null,
  allowlist: readonly string[],
): [string, string][] {
  return allowlist.reduce<[string, string][]>((acc, key) => {
    const value = getter(key);
    if (value != null) acc.push([key, value]);
    return acc;
  }, []);
}

type StorefrontRequest = Pick<Request, "headers"> &
  Partial<Pick<Request, "method" | "signal" | "url">>;

export type StorefrontRequestContext = {
  readonly [__hydrogenStorefrontRequestContextBrand]: true;
  cookie?: string;
  uniqueToken?: string;
  visitToken?: string;
  legacyTokens?: boolean;
  requestGroupId: string;
  signal?: AbortSignal;
  url?: string;
  /** Return incoming request headers plus request lifecycle headers for proxy/origin handoff. */
  getForwardedRequestHeaders(): Headers;
  /** Return mutable Storefront API subrequest headers from this request context. */
  getSubrequestHeaders(): Headers;
  /** Capture the first fresh SFAPI response headers for replay onto the final app response. */
  captureSubrequestHeaders(headers: Headers): void;
  /** Apply captured SFAPI headers and document tracking fallback headers to an app response. */
  applyResponseHeaders(headers: Headers): void;
};

type Context = Omit<
  StorefrontRequestContext,
  | "applyResponseHeaders"
  | "captureSubrequestHeaders"
  | "getForwardedRequestHeaders"
  | "getSubrequestHeaders"
> & {
  documentRequest?: boolean;
};

export function createStorefrontRequestContext(input: StorefrontRequest): StorefrontRequestContext {
  const cookie = input.headers.get("cookie") || undefined;
  const url = input.url ?? input.headers.get(STOREFRONT_URL_HEADER) ?? undefined;
  const context = {
    ...(cookie && { cookie }),
    ...(url && { url }),
    requestGroupId:
      input.headers.get(REQUEST_GROUP_ID_HEADER) ??
      input.headers.get("x-request-id") ??
      input.headers.get("request-id") ??
      crypto.randomUUID(),
    ...(isDocumentRequest(input) && { documentRequest: true }),
    ...(input.signal && { signal: input.signal }),
  } as Context;

  let capturedSubrequestHeaders:
    | {
        serverTiming: string;
        setCookie: string[];
      }
    | undefined;

  if (!cookie || !/\b_shopify_(analytics|marketing)=/.test(cookie)) {
    const legacyUniqueToken = cookie?.match(/\b_shopify_y=([^;]+)/)?.[1];
    const legacyVisitToken = cookie?.match(/\b_shopify_s=([^;]+)/)?.[1];
    const headerUniqueToken = input.headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER) ?? undefined;
    const headerVisitToken = input.headers.get(SHOPIFY_VISIT_TOKEN_HEADER) ?? undefined;

    if (legacyUniqueToken || legacyVisitToken) context.legacyTokens = true;

    context.uniqueToken = legacyUniqueToken ?? headerUniqueToken ?? crypto.randomUUID();
    context.visitToken = legacyVisitToken ?? headerVisitToken ?? crypto.randomUUID();
  }

  return {
    ...context,
    getForwardedRequestHeaders() {
      const headers = new Headers(input.headers);
      applyStorefrontRequestContextHeaders(context, headers);
      if (context.url) headers.set(STOREFRONT_URL_HEADER, context.url);
      return headers;
    },
    getSubrequestHeaders() {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      if (context.cookie) headers.set("cookie", context.cookie);
      applyStorefrontRequestContextHeaders(context, headers);
      return headers;
    },
    captureSubrequestHeaders(headers) {
      // Capture this the first time we get a fresh response to increase the
      // chance of returning it from the main server response. The main response
      // needs headers set at send time, while the body can stream later, so this
      // may not be used if subrequests finish after the main response is sent.
      capturedSubrequestHeaders ??= {
        serverTiming: headers.get(SERVER_TIMING_HEADER) ?? "",
        setCookie: headers.getSetCookie(),
      };
    },
    applyResponseHeaders(headers) {
      if (capturedSubrequestHeaders) {
        for (const value of capturedSubrequestHeaders.setCookie) {
          headers.append("set-cookie", value);
        }
        if (capturedSubrequestHeaders.serverTiming) {
          headers.append(SERVER_TIMING_HEADER, capturedSubrequestHeaders.serverTiming);
        }
      }

      // Generated fallback tokens are only for document navigation bootstrap.
      const isHtmlResponse = headers.get("content-type")?.startsWith("text/html") ?? false;
      if (!isHtmlResponse && !context.documentRequest) return;

      const existing = headers.get(SERVER_TIMING_HEADER) ?? "";
      if (context.uniqueToken && !hasServerTimingMetric(existing, UNIQUE_TOKEN_MARKER)) {
        headers.append(SERVER_TIMING_HEADER, `${UNIQUE_TOKEN_MARKER};desc=${context.uniqueToken}`);
      }
      if (context.visitToken && !hasServerTimingMetric(existing, VISIT_TOKEN_MARKER)) {
        headers.append(SERVER_TIMING_HEADER, `${VISIT_TOKEN_MARKER};desc=${context.visitToken}`);
      }
    },
  };
}

function applyStorefrontRequestContextHeaders(context: Context, headers: Headers): void {
  headers.set(REQUEST_GROUP_ID_HEADER, context.requestGroupId);
  if (context.uniqueToken) headers.set(SHOPIFY_UNIQUE_TOKEN_HEADER, context.uniqueToken);
  if (context.visitToken) headers.set(SHOPIFY_VISIT_TOKEN_HEADER, context.visitToken);
  if (context.legacyTokens && context.uniqueToken) {
    headers.set(SHOPIFY_STOREFRONT_Y_HEADER, context.uniqueToken);
  }
  if (context.legacyTokens && context.visitToken) {
    headers.set(SHOPIFY_STOREFRONT_S_HEADER, context.visitToken);
  }
}

function isDocumentRequest(request: StorefrontRequest): boolean {
  if (request.method && request.method !== "GET" && request.method !== "HEAD") return false;

  const destination = request.headers.get("sec-fetch-dest");
  if (destination === "document") return true;

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function hasServerTimingMetric(value: string, name: string): boolean {
  return value.split(",").some((part) => part.trim().startsWith(`${name};`));
}

const COMMON_PROXY_HEADER_ALLOWLIST = [
  "accept",
  "accept-encoding",
  "accept-language",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "user-agent",
] as const;

export const SFAPI_REQUEST_HEADER_ALLOWLIST = [
  ...COMMON_PROXY_HEADER_ALLOWLIST,
  "content-length",
  "access-control-request-headers",
  "access-control-request-method",
  STOREFRONT_ACCESS_TOKEN_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
] as const;

export const MCP_REQUEST_HEADER_ALLOWLIST = [...COMMON_PROXY_HEADER_ALLOWLIST];

export const AGENT_REQUEST_HEADER_ALLOWLIST = [...COMMON_PROXY_HEADER_ALLOWLIST];

export const AJAX_API_REQUEST_HEADER_ALLOWLIST = [
  ...COMMON_PROXY_HEADER_ALLOWLIST,
  "content-length",
  "x-requested-with",
];
