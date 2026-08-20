import type {
  CountryCode as CustomerAccountCountryCode,
  LanguageCode as CustomerAccountLanguageCode,
} from "../graphql/generated/customer-account-api-types";
import type {
  CountryCode as StorefrontCountryCode,
  LanguageCode as StorefrontLanguageCode,
} from "../graphql/generated/storefront-api-types";
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
import { normalizePathPrefix } from "./standard-routes/path";

const SHOPIFY_ESSENTIAL_COOKIE = "_shopify_essential";
const SHOPIFY_COOKIES = new Set([
  SHOPIFY_ESSENTIAL_COOKIE,
  "_shopify_analytics",
  "_shopify_marketing",
]);

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

type ShopifyRequestContextInputBase<I18n extends I18nConfig = I18nConfig> = {
  request: StorefrontRequest;
  i18n: I18n;
};

type ShopifyRequestContextInput<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextInputBase<I18n> & { buyerIp?: never };

type ShopifyRequestContextWithBuyerIpInput<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextInputBase<I18n> & { buyerIp: string };

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
   * Capture the first fresh SFAPI response headers for replay onto the final app response.
   * @internal
   */
  captureSubrequestHeaders(headers: Headers): void;
  /**
   * Mark the final app response as influenced by private customer state.
   * @internal
   */
  markResponseAsPersonalized(reason: string): void;

  // -- Public fields --
  i18n: NormalizedI18nConfig;
  /** Return incoming request headers plus request lifecycle headers for proxy/origin handoff. */
  getForwardedRequestHeaders(): Headers;
  /** Apply important response headers for the correct functioning of Hydrogen storefronts. */
  applyResponseHeaders(headers: Headers): void;
};

export type ShopifyRequestContext<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextBase & {
    i18n: NormalizedI18nConfig<I18n>;
  };

export type ShopifyRequestContextWithBuyerIp<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContext<I18n> & { readonly buyerIp: string };

type Context<I18n extends I18nConfig = I18nConfig> = {
  cookie?: string;
  uniqueToken?: string;
  visitToken?: string;
  legacyTokens?: boolean;
  buyerIp?: string;
  requestGroupId: string;
  signal?: AbortSignal;
  url?: string;
  storefrontOrigin?: string;
  i18n: NormalizedI18nConfig<I18n>;
  documentRequest?: boolean;
};

export function createShopifyRequestContext<const I18n extends I18nConfig>(
  input: ShopifyRequestContextWithBuyerIpInput<I18n>,
): ShopifyRequestContextWithBuyerIp<I18n>;
export function createShopifyRequestContext<const I18n extends I18nConfig>(
  input: ShopifyRequestContextInput<I18n>,
): ShopifyRequestContext<I18n>;
export function createShopifyRequestContext<const I18n extends I18nConfig>(
  input: ShopifyRequestContextInputBase<I18n> & { buyerIp?: string },
): ShopifyRequestContext<I18n> {
  const { request } = input;

  if (!input.i18n?.country || !input.i18n?.language) {
    throw new Error("i18n with country and language is required for Shopify request contexts.");
  }

  if (input.buyerIp !== undefined && !input.buyerIp) {
    throw new Error("buyerIp must be non-empty when provided");
  }

  const i18n = normalizeI18n(input.i18n);
  const cookie = request.headers.get("cookie") || undefined;
  const hasEssentialCookie = hasCookie(cookie, SHOPIFY_ESSENTIAL_COOKIE);
  const hasShopifyCookie = Array.from(SHOPIFY_COOKIES).some((name) => hasCookie(cookie, name));
  const isConsentManagementRequest = request.headers.get(CONSENT_MANAGEMENT_HEADER) === "1";
  const url = request.url ?? request.headers.get(STOREFRONT_URL_HEADER) ?? undefined;
  const storefrontOrigin = getUrlOrigin(url);
  const context = {
    ...(cookie && { cookie }),
    i18n,
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
  } as Context<I18n>;

  let capturedSubrequestHeaders:
    | {
        serverTiming: string;
        setCookie: string[];
      }
    | undefined;
  let personalizedResponseReason: string | undefined;

  if (!hasShopifyCookie) {
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
      applyStorefrontRequestHeaders(context, headers);
      if (context.url) headers.set(STOREFRONT_URL_HEADER, context.url);
      return headers;
    },
    applyStorefrontRequestHeaders(headers) {
      applyStorefrontRequestHeaders(context, headers);
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
      headers.set("powered-by", "Shopify, Hydrogen");

      const isDocumentResponse =
        context.documentRequest || (headers.get("content-type")?.startsWith("text/html") ?? false);
      const mayReturnShopifyCookies =
        !isDocumentResponse && (hasEssentialCookie || isConsentManagementRequest);
      const returnsCapturedHeaders =
        mayReturnShopifyCookies &&
        Boolean(
          capturedSubrequestHeaders?.serverTiming || capturedSubrequestHeaders?.setCookie.length,
        );

      if (capturedSubrequestHeaders && mayReturnShopifyCookies) {
        const existingSetCookies = new Set(headers.getSetCookie());
        for (const value of capturedSubrequestHeaders.setCookie) {
          if (existingSetCookies.has(value)) continue;
          headers.append("set-cookie", value);
          existingSetCookies.add(value);
        }
        const existingServerTiming = headers.get(SERVER_TIMING_HEADER) ?? "";
        if (
          capturedSubrequestHeaders.serverTiming &&
          !hasServerTimingValue(existingServerTiming, capturedSubrequestHeaders.serverTiming)
        ) {
          headers.append(SERVER_TIMING_HEADER, capturedSubrequestHeaders.serverTiming);
        }
      }

      if (!mayReturnShopifyCookies) removeShopifySetCookies(headers);

      if (
        personalizedResponseReason ||
        returnsCapturedHeaders ||
        headers.getSetCookie().some(isShopifySetCookie)
      ) {
        applyPrivateResponseCacheHeaders(headers);
      }
    },
  } as ShopifyRequestContext<I18n>;
}

function normalizeI18n<I18n extends I18nConfig>(i18n: I18n): NormalizedI18nConfig<I18n> {
  return {
    ...i18n,
    pathPrefix: normalizePathPrefix(i18n.pathPrefix),
  } as NormalizedI18nConfig<I18n>;
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

function hasCookie(cookieHeader: string | undefined, name: string): boolean {
  return (
    cookieHeader?.split(";").some((cookie) => cookie.trimStart().startsWith(`${name}=`)) ?? false
  );
}

function isShopifySetCookie(value: string): boolean {
  const name = value.match(/^\s*([^=;\s]+)\s*=/)?.[1];
  return name !== undefined && SHOPIFY_COOKIES.has(name);
}

function removeShopifySetCookies(headers: Headers): void {
  const setCookies = headers.getSetCookie();
  const filtered = setCookies.filter((value) => !isShopifySetCookie(value));
  if (filtered.length === setCookies.length) return;

  headers.delete("set-cookie");
  for (const value of filtered) headers.append("set-cookie", value);
}

function hasServerTimingValue(existing: string, next: string): boolean {
  const existingParts = new Set(existing.split(",").map((part) => part.trim()));
  return next.split(",").every((part) => existingParts.has(part.trim()));
}
