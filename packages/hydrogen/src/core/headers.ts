import type {
  CountryCode as CustomerAccountCountryCode,
  LanguageCode as CustomerAccountLanguageCode,
} from "../graphql/generated/customer-account-api-types";
import type {
  CountryCode as StorefrontCountryCode,
  LanguageCode as StorefrontLanguageCode,
} from "../graphql/generated/storefront-api-types";

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
const PRIVATE_RESPONSE_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";
const CACHE_CONTROL_HEADER = "Cache-Control";
const CDN_CACHE_CONTROL_HEADER_RE = /^(?:.+-)?cdn-cache-control$/i;
const SURROGATE_CONTROL_HEADER = "Surrogate-Control";

const UNIQUE_TOKEN_MARKER = "_y";
const VISIT_TOKEN_MARKER = "_s";

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

export type ShopifyLanguageCode = Extract<StorefrontLanguageCode, CustomerAccountLanguageCode>;
export type ShopifyCountryCode = Extract<StorefrontCountryCode, CustomerAccountCountryCode>;

export type I18nConfig = {
  language: ShopifyLanguageCode;
  country: ShopifyCountryCode;
  /** Optional app route prefix for localized paths, for example "/es-es". */
  pathPrefix?: string;
};

type NormalizedI18nConfig<I18n extends I18nConfig = I18nConfig> = Omit<I18n, "pathPrefix"> & {
  pathPrefix: string;
};

type ShopifyRequestContextInput<I18n extends I18nConfig = I18nConfig> = {
  request: StorefrontRequest;
  i18n: I18n;
};

type ShopifyRequestContextBase = {
  /** Compile-time brand so callers use createShopifyRequestContext(). */
  readonly __hydrogenShopifyRequestContextBrand: never;
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
  /** Mark the final app response as influenced by private customer state. */
  markResponseAsPersonalized(reason: string): void;
  /** Apply captured SFAPI headers and document tracking fallback headers to an app response. */
  applyResponseHeaders(headers: Headers): void;
  i18n: NormalizedI18nConfig;
};

export type ShopifyRequestContext<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextBase & {
    i18n: NormalizedI18nConfig<I18n>;
  };

type Context<I18n extends I18nConfig = I18nConfig> = {
  cookie?: string;
  uniqueToken?: string;
  visitToken?: string;
  legacyTokens?: boolean;
  requestGroupId: string;
  signal?: AbortSignal;
  url?: string;
  i18n: NormalizedI18nConfig<I18n>;
  documentRequest?: boolean;
};

export function createShopifyRequestContext<const I18n extends I18nConfig>(
  input: ShopifyRequestContextInput<I18n>,
): ShopifyRequestContext<I18n>;
export function createShopifyRequestContext<const I18n extends I18nConfig>(
  input: ShopifyRequestContextInput<I18n>,
): ShopifyRequestContext<I18n> {
  const { request } = input;

  if (!input.i18n?.country || !input.i18n?.language) {
    throw new Error("i18n with country and language is required for Shopify request contexts.");
  }

  const i18n = normalizeI18n(input.i18n);
  const cookie = request.headers.get("cookie") || undefined;
  const url = request.url ?? request.headers.get(STOREFRONT_URL_HEADER) ?? undefined;
  const context = {
    ...(cookie && { cookie }),
    i18n,
    ...(url && { url }),
    requestGroupId:
      request.headers.get(REQUEST_GROUP_ID_HEADER) ??
      request.headers.get("x-request-id") ??
      request.headers.get("request-id") ??
      crypto.randomUUID(),
    ...(isDocumentRequest(request) && { documentRequest: true }),
    ...(request.signal && { signal: request.signal }),
  } as Context<I18n>;

  let capturedSubrequestHeaders:
    | {
        serverTiming: string;
        setCookie: string[];
      }
    | undefined;
  let personalizedResponseReason: string | undefined;

  if (!cookie || !/\b_shopify_(analytics|marketing)=/.test(cookie)) {
    const legacyUniqueToken = cookie?.match(/\b_shopify_y=([^;]+)/)?.[1];
    const legacyVisitToken = cookie?.match(/\b_shopify_s=([^;]+)/)?.[1];
    const headerUniqueToken = request.headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER) ?? undefined;
    const headerVisitToken = request.headers.get(SHOPIFY_VISIT_TOKEN_HEADER) ?? undefined;

    if (legacyUniqueToken || legacyVisitToken) context.legacyTokens = true;

    context.uniqueToken = legacyUniqueToken ?? headerUniqueToken ?? crypto.randomUUID();
    context.visitToken = legacyVisitToken ?? headerVisitToken ?? crypto.randomUUID();
  }

  return {
    ...context,
    getForwardedRequestHeaders() {
      const headers = new Headers(request.headers);
      applyShopifyRequestContextHeaders(context, headers);
      if (context.url) headers.set(STOREFRONT_URL_HEADER, context.url);
      return headers;
    },
    getSubrequestHeaders() {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      if (context.cookie) headers.set("cookie", context.cookie);
      applyShopifyRequestContextHeaders(context, headers);
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
    markResponseAsPersonalized(reason) {
      personalizedResponseReason ??= reason;
    },
    applyResponseHeaders(headers) {
      if (capturedSubrequestHeaders) {
        const existingSetCookies = headers.getSetCookie();
        for (const value of capturedSubrequestHeaders.setCookie) {
          if (existingSetCookies.includes(value)) continue;
          headers.append("set-cookie", value);
        }
        const existingServerTiming = headers.get(SERVER_TIMING_HEADER) ?? "";
        if (
          capturedSubrequestHeaders.serverTiming &&
          !hasServerTimingValue(existingServerTiming, capturedSubrequestHeaders.serverTiming)
        ) {
          headers.append(SERVER_TIMING_HEADER, capturedSubrequestHeaders.serverTiming);
        }
      }

      if (personalizedResponseReason) {
        applyPersonalizedResponseCacheHeaders(headers);
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
  } as ShopifyRequestContext<I18n>;
}

function applyPersonalizedResponseCacheHeaders(headers: Headers): void {
  headers.set(CACHE_CONTROL_HEADER, PRIVATE_RESPONSE_CACHE_CONTROL);
  for (const header of Array.from(headers.keys())) {
    if (
      CDN_CACHE_CONTROL_HEADER_RE.test(header) ||
      header.toLowerCase() === SURROGATE_CONTROL_HEADER.toLowerCase()
    ) {
      headers.delete(header);
    }
  }
}

function normalizeI18n<I18n extends I18nConfig>(i18n: I18n): NormalizedI18nConfig<I18n> {
  return {
    ...i18n,
    pathPrefix: normalizePathPrefix(i18n.pathPrefix),
  } as NormalizedI18nConfig<I18n>;
}

function normalizePathPrefix(pathPrefix: string | undefined): string {
  const normalized = pathPrefix?.trim().replace(/^\/+/, "").replace(/\/+$/, "") ?? "";
  return normalized ? `/${normalized}` : "";
}

function applyShopifyRequestContextHeaders(context: Context, headers: Headers): void {
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

function hasServerTimingValue(existing: string, next: string): boolean {
  const existingParts = new Set(existing.split(",").map((part) => part.trim()));
  return next.split(",").every((part) => existingParts.has(part.trim()));
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
