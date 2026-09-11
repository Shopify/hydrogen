import { STOREFRONT_API_VERSION } from "./constants";
import {
  applyPrivateResponseCacheHeaders,
  CONSENT_MANAGEMENT_HEADER,
  HYDROGEN_VERSION_HEADER,
  REQUEST_GROUP_ID_HEADER,
  SDK_VARIANT_HEADER,
  SDK_VARIANT_SOURCE_HEADER,
  SDK_VERSION_HEADER,
  SERVER_TIMING_HEADER,
  SHOPIFY_STOREFRONT_ORIGIN_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
  STOREFRONT_URL_HEADER,
} from "./headers";
import { matchLocale, resolveSupportedLocale } from "./i18n/match";
import type {
  ShopifyCountryCode,
  ShopifyI18n,
  ShopifyLanguageCode,
  ShopifyLocale,
  ShopifyMatchedLocale,
} from "./i18n/types";

export type { ShopifyCountryCode, ShopifyLanguageCode } from "./i18n/types";

const SHOPIFY_ESSENTIAL_COOKIE = "_shopify_essential";
const SHOPIFY_TRACKING_COOKIES = ["_shopify_analytics", "_shopify_marketing"];
const SHOPIFY_COOKIES = new Set([SHOPIFY_ESSENTIAL_COOKIE, ...SHOPIFY_TRACKING_COOKIES]);

type StorefrontRequest = Pick<Request, "headers"> &
  Partial<Pick<Request, "method" | "signal" | "url">>;

type ShopifyRequestContextInputBase<TI18n extends ShopifyI18n = ShopifyI18n> = {
  request: StorefrontRequest;
  /** Module-scope definition from `defineShopifyI18n`. */
  i18n: TI18n;
  /**
   * Skip URL matching and use this locale. Must be one of the definition's supported locales.
   * Intended for contexts without a meaningful request URL, such as static rendering.
   */
  locale?: ShopifyLocale;
};

type ShopifyRequestContextInput<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContextInputBase<TI18n> & { buyerIp?: never };

type ShopifyRequestContextWithBuyerIpInput<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContextInputBase<TI18n> & { buyerIp: string };

type ShopifyRequestContextBase = {
  // -- Private fields --
  /**
   * Compile-time brand so callers use createShopifyRequestContext().
   * @internal
   */
  readonly __hydrogenShopifyRequestContextBrand: never;
  /** @internal */
  cookie?: string;
  /** @internal */
  uniqueToken?: string;
  /** @internal */
  visitToken?: string;
  /** @internal */
  legacyTokens?: boolean;
  /** @internal */
  readonly buyerIp?: string;
  /** @internal */
  requestGroupId: string;
  /** @internal */
  signal?: AbortSignal;
  /** @internal */
  url?: string;
  /** @internal */
  storefrontOrigin?: string;
  /**
   * Apply request-scoped headers required by every Shopify storefront subrequest.
   * @internal
   */
  applyStorefrontRequestHeaders(headers: Headers): void;
  /**
   * Capture the first fresh storefront response headers for replay onto the final app response.
   * @internal
   */
  captureSubrequestHeaders(headers: Headers): void;
  /**
   * Consume storefront proxy response state for gated replay onto the final app response.
   * @internal
   */
  consumeStorefrontResponseHeaders(headers: Headers): void;
  /**
   * Mark the final app response as influenced by private customer state.
   * @internal
   */
  markResponseAsPersonalized(reason: string): void;
  /**
   * Mark this request as a sanctioned session-establishing endpoint (like the
   * consent flow), permitting Shopify state to return even on a cold session.
   * @internal
   */
  markResponseAsSessionEstablishing(reason: string): void;

  // -- Public fields --
  /** Return incoming request headers plus request lifecycle headers for proxy/origin handoff. */
  getForwardedRequestHeaders(): Headers;
  /** Apply important response headers for the correct functioning of Hydrogen storefronts. */
  applyResponseHeaders(headers: Headers): void;
};

export type ShopifyRequestContext<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContextBase & {
    /** The storefront's i18n definition, as passed to `createShopifyRequestContext`. */
    i18n: TI18n;
    /** The locale resolved for this request, with the path prefix it is served under. */
    locale: ShopifyMatchedLocale<TI18n>;
  };

export type ShopifyRequestContextWithBuyerIp<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContext<TI18n> & { readonly buyerIp: string };

type Context<TI18n extends ShopifyI18n = ShopifyI18n> = {
  cookie?: string;
  uniqueToken?: string;
  visitToken?: string;
  legacyTokens?: boolean;
  buyerIp?: string;
  requestGroupId: string;
  signal?: AbortSignal;
  url?: string;
  storefrontOrigin?: string;
  i18n: TI18n;
  locale: ShopifyMatchedLocale<TI18n>;
  documentRequest?: boolean;
};

export function createShopifyRequestContext<const TI18n extends ShopifyI18n>(
  input: ShopifyRequestContextWithBuyerIpInput<TI18n>,
): ShopifyRequestContextWithBuyerIp<TI18n>;
export function createShopifyRequestContext<const TI18n extends ShopifyI18n>(
  input: ShopifyRequestContextInput<TI18n>,
): ShopifyRequestContext<TI18n>;
export function createShopifyRequestContext<const TI18n extends ShopifyI18n>(
  input: ShopifyRequestContextInputBase<TI18n> & { buyerIp?: string },
): ShopifyRequestContext<TI18n> {
  const { request, i18n } = input;

  if (!i18n?.defaultLocale?.country || !i18n?.defaultLocale?.language) {
    throw new Error(
      "i18n from defineShopifyI18n (with a defaultLocale) is required for Shopify request contexts.",
    );
  }

  if (input.buyerIp !== undefined && !input.buyerIp) {
    throw new Error("buyerIp must be non-empty when provided");
  }

  const requestMethod = request.method?.toUpperCase();
  const cookieHeader = request.headers.get("cookie") || undefined;
  const inboundCookies = parseCookieHeader(cookieHeader);
  const hasEssentialCookie = inboundCookies.has(SHOPIFY_ESSENTIAL_COOKIE);
  const hasTrackingCookie = SHOPIFY_TRACKING_COOKIES.some((name) => inboundCookies.has(name));
  const isConsentManagementRequest = request.headers.get(CONSENT_MANAGEMENT_HEADER) === "1";
  const url = request.url ?? request.headers.get(STOREFRONT_URL_HEADER) ?? undefined;
  const storefrontOrigin = getUrlOrigin(url);
  const locale = input.locale ? resolveSupportedLocale(input.locale, i18n) : matchLocale(url, i18n);
  const context = {
    ...(cookieHeader && { cookie: cookieHeader }),
    i18n,
    locale,
    ...(url && { url }),
    ...(storefrontOrigin && { storefrontOrigin }),
    ...(input.buyerIp && { buyerIp: input.buyerIp }),
    requestGroupId:
      request.headers.get(REQUEST_GROUP_ID_HEADER) ??
      request.headers.get("x-request-id") ??
      request.headers.get("request-id") ??
      crypto.randomUUID(),
    ...(isDocumentRequest(request) && { documentRequest: true }),
    ...(request.signal && { signal: request.signal }),
  } as Context<TI18n>;

  let capturedSubrequestHeaders:
    | {
        serverTiming: string;
        setCookie: string[];
      }
    | undefined;
  let personalizedResponseReason: string | undefined;
  let sessionEstablishingReason: string | undefined;

  const captureSubrequestHeaders = (headers: Headers): void => {
    // Capture this the first time we get a fresh response to increase the
    // chance of returning it from the main server response. The main response
    // needs headers set at send time, while the body can stream later, so this
    // may not be used if subrequests finish after the main response is sent.
    capturedSubrequestHeaders ??= {
      serverTiming: headers.get(SERVER_TIMING_HEADER) ?? "",
      setCookie: headers.getSetCookie(),
    };
  };

  if (!hasTrackingCookie) {
    const legacyUniqueToken = inboundCookies.get("_shopify_y");
    const legacyVisitToken = inboundCookies.get("_shopify_s");
    const headerUniqueToken = request.headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER) ?? undefined;
    const headerVisitToken = request.headers.get(SHOPIFY_VISIT_TOKEN_HEADER) ?? undefined;

    if (legacyUniqueToken || legacyVisitToken) context.legacyTokens = true;

    context.uniqueToken = legacyUniqueToken ?? headerUniqueToken;
    context.visitToken = legacyVisitToken ?? headerVisitToken;
  }

  return {
    ...context,
    getForwardedRequestHeaders() {
      const headers = new Headers(request.headers);
      applyStorefrontRequestHeaders(context, headers);
      if (context.url) headers.set(STOREFRONT_URL_HEADER, context.url);
      return headers;
    },
    applyStorefrontRequestHeaders(headers) {
      applyStorefrontRequestHeaders(context, headers);
    },
    captureSubrequestHeaders,
    consumeStorefrontResponseHeaders(headers) {
      if (headers.has(SERVER_TIMING_HEADER) || headers.getSetCookie().length > 0) {
        captureSubrequestHeaders(headers);
      }
      headers.delete("set-cookie");
      headers.delete(SERVER_TIMING_HEADER);
    },
    markResponseAsPersonalized(reason) {
      personalizedResponseReason ??= reason;
    },
    markResponseAsSessionEstablishing(reason) {
      sessionEstablishingReason ??= reason;
    },
    applyResponseHeaders(headers) {
      headers.set("powered-by", "Shopify, Hydrogen");

      // Documents may be shared or streamed, so they must not carry buyer-specific state.
      const isDocumentResponse =
        context.documentRequest || (headers.get("content-type")?.startsWith("text/html") ?? false);

      // Keep GET and HEAD responses cacheable, and fail closed when the request method is unknown.
      // Cold sessions may only be established by the explicitly marked consent request.
      const mayReturnShopifyState =
        requestMethod !== undefined &&
        requestMethod !== "GET" &&
        requestMethod !== "HEAD" &&
        !isDocumentResponse &&
        (hasEssentialCookie ||
          isConsentManagementRequest ||
          sessionEstablishingReason !== undefined);

      // Replay state captured from fresh SFAPI and proxy responses when allowed.
      if (capturedSubrequestHeaders && mayReturnShopifyState) {
        const existingSetCookies = new Set(headers.getSetCookie());
        for (const value of capturedSubrequestHeaders.setCookie) {
          if (existingSetCookies.has(value)) continue;
          headers.append("set-cookie", value);
          existingSetCookies.add(value);
        }

        const capturedServerTiming = capturedSubrequestHeaders.serverTiming;
        const existingServerTiming = headers.get(SERVER_TIMING_HEADER) ?? "";
        const shouldAppendServerTiming =
          capturedServerTiming !== "" &&
          existingServerTiming !== capturedServerTiming &&
          !existingServerTiming.startsWith(`${capturedServerTiming}, `) &&
          !existingServerTiming.endsWith(`, ${capturedServerTiming}`);
        if (shouldAppendServerTiming) {
          headers.set(
            SERVER_TIMING_HEADER,
            existingServerTiming
              ? `${existingServerTiming}, ${capturedServerTiming}`
              : capturedServerTiming,
          );
        }
      }

      // Responses containing buyer-specific or replayed state must not enter shared caches.
      const returnsCapturedState =
        mayReturnShopifyState &&
        Boolean(
          capturedSubrequestHeaders?.serverTiming || capturedSubrequestHeaders?.setCookie.length,
        );

      if (
        personalizedResponseReason ||
        returnsCapturedState ||
        headers.getSetCookie().some(isShopifySetCookie)
      ) {
        applyPrivateResponseCacheHeaders(headers);
      }
    },
  } as ShopifyRequestContext<TI18n>;
}

function applyStorefrontRequestHeaders(context: Context, headers: Headers): void {
  headers.set(SDK_VARIANT_HEADER, "hydrogen");
  headers.set(SDK_VARIANT_SOURCE_HEADER, "kit");
  headers.set(SDK_VERSION_HEADER, STOREFRONT_API_VERSION);
  headers.set(HYDROGEN_VERSION_HEADER, __HYDROGEN_VERSION__);
  headers.set(REQUEST_GROUP_ID_HEADER, context.requestGroupId);

  if (context.cookie) headers.set("cookie", context.cookie);
  else headers.delete("cookie");
  if (context.storefrontOrigin) {
    headers.set(SHOPIFY_STOREFRONT_ORIGIN_HEADER, context.storefrontOrigin);
  } else headers.delete(SHOPIFY_STOREFRONT_ORIGIN_HEADER);

  // Some Storefront API consumers still rely on these headers instead of cookies.
  if (context.uniqueToken) headers.set(SHOPIFY_UNIQUE_TOKEN_HEADER, context.uniqueToken);
  if (context.visitToken) headers.set(SHOPIFY_VISIT_TOKEN_HEADER, context.visitToken);
  if (context.legacyTokens && context.uniqueToken) {
    headers.set(SHOPIFY_STOREFRONT_Y_HEADER, context.uniqueToken);
  }
  if (context.legacyTokens && context.visitToken) {
    headers.set(SHOPIFY_STOREFRONT_S_HEADER, context.visitToken);
  }
}

function getUrlOrigin(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function isDocumentRequest(request: StorefrontRequest): boolean {
  if (request.method && request.method !== "GET" && request.method !== "HEAD") return false;

  const destination = request.headers.get("sec-fetch-dest");
  if (destination === "document") return true;

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function parseCookieHeader(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;

    const name = cookie.slice(0, separator).trim();
    if (!cookies.has(name)) cookies.set(name, cookie.slice(separator + 1));
  }

  return cookies;
}

function isShopifySetCookie(value: string): boolean {
  const name = value.match(/^\s*([^=;\s]+)\s*=/)?.[1];
  return name !== undefined && SHOPIFY_COOKIES.has(name);
}
