import { STOREFRONT_API_VERSION } from "./constants";
import {
  applyNoStoreResponseCacheHeaders,
  applyPrivateResponseCacheHeaders,
  CONSENT_MANAGEMENT_HEADER,
  HYDROGEN_VERSION_HEADER,
  REQUEST_GROUP_ID_HEADER,
  SDK_VARIANT_HEADER,
  SDK_VARIANT_SOURCE_HEADER,
  SDK_VERSION_HEADER,
  SEC_GPC_HEADER,
  SHOPIFY_STOREFRONT_ORIGIN_HEADER,
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
import { getLogger } from "./logging";
import { getSafeRetryAfterValue, RATE_LIMITED_STATUS } from "./request-routing/rate-limit";
import { normalizePathPrefix } from "./standard-routes/path";

export type { ShopifyCountryCode, ShopifyLanguageCode } from "./i18n/types";

const log = getLogger("rate-limit");

/**
 * Deprecated: a fixed request locale with an optional path prefix. Removed in the next major release.
 * @deprecated Pass a definition from `defineShopifyI18n` to `createShopifyRequestContext` instead. Use `ShopifyLocale` for `{language, country}` and `ShopifyMatchedLocale` for the resolved locale. Removed in the next major release.
 */
export type I18nConfig = {
  /** The request's language. */
  language: ShopifyLanguageCode;
  /** The request's country. */
  country: ShopifyCountryCode;
  /**
   * The URL prefix for localized routes, such as `/es-es`. Hydrogen adds the prefix to standard route redirects and product variant URLs.
   */
  pathPrefix?: string;
};

type NormalizedI18nConfig<TConfig extends I18nConfig> = Omit<TConfig, "pathPrefix"> & {
  pathPrefix: string;
};

/** The locale a request context resolves: matched from a definition, or the legacy fixed locale. */
type RequestLocale<TI18n extends ShopifyI18n | I18nConfig> = TI18n extends ShopifyI18n
  ? ShopifyMatchedLocale<TI18n>
  : TI18n extends I18nConfig
    ? NormalizedI18nConfig<TI18n>
    : never;

const SHOPIFY_ESSENTIAL_COOKIE = "_shopify_essential";

/** The incoming request's headers, plus its method, abort signal, and URL when the framework provides them. */
type StorefrontRequest = Pick<Request, "headers"> &
  Partial<Pick<Request, "method" | "signal" | "url">>;

/** The incoming request and the storefront's i18n definition. */
type ShopifyRequestContextInputBase<TI18n extends ShopifyI18n = ShopifyI18n> = {
  /**
   * The incoming request from your framework. When the framework exposes no request, such as during prerendering, pass `{ headers: new Headers() }`.
   */
  request: StorefrontRequest;
  /** The storefront's i18n definition from `defineShopifyI18n`. Hydrogen matches the request's locale against it. */
  i18n: TI18n;
  /**
   * The locale to use instead of matching the request URL. The locale must be one of the definition's supported locales.
   * Pass it when the request has no meaningful URL, such as during static rendering.
   */
  locale?: ShopifyLocale;
};

type ShopifyRequestContextInput<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContextInputBase<TI18n> & { buyerIp?: never };

type ShopifyRequestContextWithBuyerIpInput<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContextInputBase<TI18n> & { buyerIp: string };

/**
 * Deprecated: the request and a fixed locale, used for every request with no URL matching. Pass a definition from `defineShopifyI18n` as `i18n` instead. Removed in the next major release.
 */
type LegacyShopifyRequestContextInput<TConfig extends I18nConfig> = {
  request: StorefrontRequest;
  /** Deprecated: the fixed `{language, country, pathPrefix}` for every request. */
  i18n: TConfig;
  locale?: never;
};

type RequestContextInput =
  | ShopifyRequestContextInputBase
  | LegacyShopifyRequestContextInput<I18nConfig>;

/** The fields and methods on every request context. */
type ShopifyRequestContextBase = {
  // -- Private fields --
  /**
   * A type-only marker. Create request contexts only with `createShopifyRequestContext`.
   * @internal
   */
  readonly __hydrogenShopifyRequestContextBrand: never;
  /**
   * The incoming request's `Cookie` header. Hydrogen forwards the header to the Storefront API.
   * @internal
   */
  cookie?: string;
  /**
   * The customer's trusted IP address. Private Storefront API clients require it.
   * @internal
   */
  readonly buyerIp?: string;
  /**
   * The i18n definition the context matched its locale against. Absent for the deprecated fixed-locale input.
   * @internal
   */
  readonly i18nDefinition?: ShopifyI18n;
  /**
   * The ID that groups this request's Shopify API calls. Hydrogen reads the ID from the request headers or generates one.
   * @internal
   */
  requestGroupId: string;
  /**
   * The incoming request's abort signal. Hydrogen's API clients stop their requests when the signal aborts.
   * @internal
   */
  signal?: AbortSignal;
  /**
   * The incoming request's URL.
   * @internal
   */
  url?: string;
  /**
   * The origin of the incoming request's URL. Hydrogen forwards the origin to the Storefront API.
   * @internal
   */
  storefrontOrigin?: string;
  /**
   * Adds the Hydrogen SDK headers and the customer's cookie, privacy, and origin headers to a
   * Storefront API request. The Storefront API client and the API proxies call the method for you.
   * @internal
   */
  applyStorefrontRequestHeaders(headers: Headers): void;
  /**
   * Saves the cookies from the first Storefront API response that sets cookies. The Storefront API
   * client calls the method for you, and `applyResponseHeaders()` can add the cookies to your response.
   * @internal
   */
  captureSubrequestHeaders(headers: Headers): void;
  /**
   * Saves the cookies from a proxied Storefront API response and removes the `set-cookie` header
   * from that response. The API proxies in `handleShopifyRoutes` call the method for you.
   * @internal
   */
  consumeStorefrontResponseHeaders(headers: Headers): void;
  /**
   * Tracks Storefront API `429` responses and the latest valid retry deadline, independent of
   * completion order. Delay-seconds start at capture time; HTTP dates specify absolute deadlines.
   * Invalid values do not replace valid advice. The Storefront API client calls the method for you.
   * @internal
   */
  captureStorefrontRateLimit?(retryAfter: string | undefined): void;
  /**
   * Lets the final response set Shopify cookies before the customer has a Shopify session, and
   * marks the response as private and uncacheable. The UCP MCP proxy calls the method for you.
   * @internal
   */
  markResponseAsSessionEstablishing(reason: string): void;

  // -- Public fields --
  /** Returns the incoming request's headers with Shopify's request headers added. Pass the headers when you forward the request to a proxy or another origin. */
  getForwardedRequestHeaders(): Headers;
  /**
   * Marks the final response as private and uncacheable because the response holds customer data, such as a server-rendered cart. `applyResponseHeaders()` then sets `Cache-Control: private, no-store, max-age=0, must-revalidate` and removes `Surrogate-Control` and every vendor `*-Cache-Control` header. Call the method before `applyResponseHeaders()`, and only on requests whose response holds customer data, so other responses stay cacheable. Pass a short `reason` that names the customer data. The Customer Account API client and the customer session call the method for you.
   */
  markResponseAsPersonalized(reason: string): void;
  /**
   * Adds the headers that a Hydrogen storefront needs to the final response. Call the method on each response that your app builds. Responses from `handleShopifyRoutes` and `handleShopifyRedirects` already carry these headers.
   *
   * Append your committed session headers before you call the method. The method makes any response that sets a cookie private and uncacheable. The method also sets the `powered-by` header, makes responses marked with `markResponseAsPersonalized()` private and uncacheable, and adds eligible Shopify cookies only to non-document responses for methods other than `GET` and `HEAD`.
   *
   * Pass the response's `status` as well. When the status is `429` and the Storefront API rate limited a request that used this context, the method sets `Cache-Control: no-store` and removes `Surrogate-Control` and every vendor `*-Cache-Control` header. It also sets `Retry-After` to the later of the response's own valid `Retry-After` value and the latest valid retry deadline from all Storefront API `429` responses on this context, including recovered errors. Delay-seconds and IMF-fixdates are accepted. The value is the remaining delay-seconds, rounded up and never negative. React Router doesn't copy the headers of a thrown response, so this keeps the headers of a `429` from `withStorefrontRateLimit`. Responses with other statuses keep their cache headers.
   *
   * When you omit `status` after a Storefront API rate limit, the method logs one warning and adds no rate-limit headers.  The `429` response can then lose `Retry-After` and `Cache-Control: no-store`.
   */
  applyResponseHeaders(headers: Headers, status?: number): void;
};

/** The context for one request. Pass the context to Hydrogen's API clients and route handlers for that request. */
export type ShopifyRequestContext<TI18n extends ShopifyI18n | I18nConfig = ShopifyI18n> =
  ShopifyRequestContextBase & {
    /** The locale resolved for this request, with the path prefix it is served under. */
    locale: RequestLocale<TI18n>;
    /**
     * The locale resolved for this request.
     * @deprecated Use `locale` instead. Removed in the next major release.
     */
    i18n: RequestLocale<TI18n>;
  };

/** A request context that includes the customer's IP address. Private Storefront API clients require this context. */
export type ShopifyRequestContextWithBuyerIp<TI18n extends ShopifyI18n | I18nConfig = ShopifyI18n> =
  ShopifyRequestContext<TI18n> & { readonly buyerIp: string };

/** The values that the request context reads from the incoming request. */
type Context<TI18n extends ShopifyI18n | I18nConfig = ShopifyI18n> = {
  /** The incoming request's `Cookie` header. */
  cookie?: string;
  /** The incoming request's `Sec-GPC` header value, which carries the customer's Global Privacy Control signal. */
  globalPrivacyControl?: string;
  /** The customer's trusted IP address. */
  buyerIp?: string;
  /** The ID that groups this request's Shopify API calls. Hydrogen reads the ID from the request headers or generates one. */
  requestGroupId: string;
  /** The incoming request's abort signal. */
  signal?: AbortSignal;
  /** The incoming request's URL. */
  url?: string;
  /** The origin of the incoming request's URL. */
  storefrontOrigin?: string;
  /** The locale resolved for this request. */
  locale: RequestLocale<TI18n>;
  /** The same locale, under its deprecated name. */
  i18n: RequestLocale<TI18n>;
  /** The i18n definition the locale was matched against. */
  i18nDefinition?: ShopifyI18n;
  /** Whether the incoming request asks for an HTML document. */
  documentRequest?: boolean;
};

/**
 * @deprecated Pass a definition from `defineShopifyI18n` as `i18n` instead of a fixed `{language, country, pathPrefix}`. Removed in the next major release.
 */
export function createShopifyRequestContext<const TConfig extends I18nConfig>(
  input: LegacyShopifyRequestContextInput<TConfig> & { buyerIp: string },
): ShopifyRequestContextWithBuyerIp<TConfig>;
/**
 * @deprecated Pass a definition from `defineShopifyI18n` as `i18n` instead of a fixed `{language, country, pathPrefix}`. Removed in the next major release.
 */
export function createShopifyRequestContext<const TConfig extends I18nConfig>(
  input: LegacyShopifyRequestContextInput<TConfig> & { buyerIp?: never },
): ShopifyRequestContext<TConfig>;
/**
 * Creates the context for one incoming request. Pass the same context to the Storefront API
 * client, the Customer Account API client, and `handleShopifyRoutes`. The context resolves the
 * request's locale from your i18n definition, forwards the customer's cookies, locale, and privacy
 * signal to Shopify, and adds Shopify's cookies and cache headers to your response.
 *
 * Call `applyResponseHeaders()` on each response that your app builds. Pass `buyerIp` with the customer's trusted IP address when you use a private Storefront API client. The function throws when `i18n` doesn't come from `defineShopifyI18n`, when `locale` isn't one of the definition's supported locales, and when `buyerIp` is an empty string.
 *
 * @publicDocs
 */
export function createShopifyRequestContext<const TI18n extends ShopifyI18n>(
  input: ShopifyRequestContextWithBuyerIpInput<TI18n>,
): ShopifyRequestContextWithBuyerIp<TI18n>;
export function createShopifyRequestContext<const TI18n extends ShopifyI18n>(
  input: ShopifyRequestContextInput<TI18n>,
): ShopifyRequestContext<TI18n>;
/**
 * @param input The incoming request, the storefront's i18n definition, and the customer's IP address for private Storefront API clients.
 * @returns The context to pass to Hydrogen's API clients and route handlers for this request.
 */
export function createShopifyRequestContext<const TI18n extends ShopifyI18n>(
  input: (ShopifyRequestContextInputBase<TI18n> | LegacyShopifyRequestContextInput<I18nConfig>) & {
    buyerIp?: string;
  },
): ShopifyRequestContext<TI18n> {
  const { request } = input;

  if (input.buyerIp !== undefined && !input.buyerIp) {
    throw new Error("buyerIp must be non-empty when provided");
  }

  const requestMethod = request.method?.toUpperCase();
  const cookieHeader = request.headers.get("cookie") || undefined;
  const inboundCookies = parseCookieHeader(cookieHeader);
  const hasEssentialCookie = inboundCookies.has(SHOPIFY_ESSENTIAL_COOKIE);
  const isConsentManagementRequest = request.headers.get(CONSENT_MANAGEMENT_HEADER) === "1";
  const url = request.url ?? request.headers.get(STOREFRONT_URL_HEADER) ?? undefined;
  const storefrontOrigin = getUrlOrigin(url);
  const locale = resolveRequestLocale(input, url);
  const context = {
    ...(cookieHeader && { cookie: cookieHeader }),
    globalPrivacyControl: request.headers.get(SEC_GPC_HEADER) ?? undefined,
    locale,
    i18n: locale,
    ...(isI18nDefinition(input.i18n) && { i18nDefinition: input.i18n }),
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
  } as Context<ShopifyI18n | I18nConfig>;

  let capturedCookies: string[] | undefined;
  let personalizedResponseReason: string | undefined;
  let sessionEstablishingReason: string | undefined;
  let storefrontRateLimited = false;
  let storefrontRetryDeadline: bigint | undefined;
  let warnedMissingStatus = false;

  const captureSubrequestHeaders = (headers: Headers): void => {
    // Capture the first fresh response cookies to increase the
    // chance of returning them from the main server response. The main response
    // needs headers set at send time, while the body can stream later, so this
    // may not be used if subrequests finish after the main response is sent.
    const cookies = headers.getSetCookie();
    if (cookies.length > 0) capturedCookies ??= cookies;
  };

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
      captureSubrequestHeaders(headers);
      headers.delete("set-cookie");
    },
    captureStorefrontRateLimit(retryAfter) {
      storefrontRateLimited = true;
      const value = getSafeRetryAfterValue(retryAfter);
      if (value === undefined) return;

      const deadline = getRetryDeadline(value);
      if (storefrontRetryDeadline === undefined || deadline > storefrontRetryDeadline) {
        storefrontRetryDeadline = deadline;
      }
    },
    markResponseAsPersonalized(reason) {
      personalizedResponseReason ??= reason;
    },
    markResponseAsSessionEstablishing(reason) {
      sessionEstablishingReason ??= reason;
    },
    applyResponseHeaders(headers, status) {
      headers.set("powered-by", "Shopify, Hydrogen");

      // Without the status, the method cannot tell a `429` from a recovered page, and a framework
      // can drop the rate-limit headers silently. Warn once so the omission is visible.
      if (status === undefined && storefrontRateLimited && !warnedMissingStatus) {
        warnedMissingStatus = true;
        log.warn(
          "storefront api rate limited this request; pass response.status to applyResponseHeaders to keep rate-limit headers on a 429",
        );
      }

      // A framework can drop the headers of a thrown `429` response, as React Router does, so add
      // them here. Only a `429` changes: a page that recovered from the rate limit keeps its cache
      // headers.
      if (status === RATE_LIMITED_STATUS && storefrontRateLimited) {
        applyNoStoreResponseCacheHeaders(headers);
        // The retry advice is the later of the response's own valid header and the latest captured
        // deadline, so one rule applies whichever path produced the `429`.
        const existing = getSafeRetryAfterValue(headers.get("retry-after"));
        let deadline = storefrontRetryDeadline;
        if (existing !== undefined) {
          const existingDeadline = getRetryDeadline(existing);
          if (deadline === undefined || existingDeadline > deadline) deadline = existingDeadline;
        }
        if (deadline !== undefined) {
          const remaining = deadline - BigInt(Date.now());
          const seconds = remaining > 0n ? (remaining + 999n) / 1000n : 0n;
          headers.set("Retry-After", seconds.toString());
        }
      }

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

      // Replay cookies captured from fresh SFAPI and proxy responses when allowed.
      if (capturedCookies && mayReturnShopifyState) {
        const existingSetCookies = new Set(headers.getSetCookie());
        for (const value of capturedCookies) {
          if (existingSetCookies.has(value)) continue;
          headers.append("set-cookie", value);
          existingSetCookies.add(value);
        }
      }

      // Consent/session responses can contain private state in the body without setting cookies.
      if (
        personalizedResponseReason ||
        isConsentManagementRequest ||
        sessionEstablishingReason !== undefined ||
        headers.has("set-cookie")
      ) {
        applyPrivateResponseCacheHeaders(headers);
      }
    },
  } as ShopifyRequestContext<TI18n>;
}

// BigInt preserves valid delays without rounding or overflow, including very large values.
// `value` must come from `getSafeRetryAfterValue`.
function getRetryDeadline(value: string): bigint {
  return value.endsWith("GMT")
    ? BigInt(Date.parse(value))
    : BigInt(Date.now()) + BigInt(value) * 1000n;
}

function resolveRequestLocale(
  input: RequestContextInput,
  url: string | undefined,
): RequestLocale<ShopifyI18n | I18nConfig> {
  const { i18n } = input;
  if (isI18nDefinition(i18n)) {
    return input.locale ? resolveSupportedLocale(input.locale, i18n) : matchLocale(url, i18n);
  }
  // Legacy `I18nConfig` input pins one locale, exactly as before definitions existed.
  if (i18n && "country" in i18n && i18n.country && i18n.language) {
    return { ...i18n, pathPrefix: normalizePathPrefix(i18n.pathPrefix) };
  }
  throw new Error(
    "i18n from defineShopifyI18n (with a defaultLocale) is required for Shopify request contexts.",
  );
}

function isI18nDefinition(i18n: RequestContextInput["i18n"] | undefined): i18n is ShopifyI18n {
  return Boolean(
    i18n && "defaultLocale" in i18n && i18n.defaultLocale?.country && i18n.defaultLocale.language,
  );
}

function applyStorefrontRequestHeaders(context: Context, headers: Headers): void {
  headers.set(SDK_VARIANT_HEADER, "hydrogen");
  headers.set(SDK_VARIANT_SOURCE_HEADER, "kit");
  headers.set(SDK_VERSION_HEADER, STOREFRONT_API_VERSION);
  headers.set(HYDROGEN_VERSION_HEADER, __HYDROGEN_VERSION__);
  headers.set(REQUEST_GROUP_ID_HEADER, context.requestGroupId);

  if (context.cookie) headers.set("cookie", context.cookie);
  else headers.delete("cookie");
  if (context.globalPrivacyControl !== undefined) {
    headers.set(SEC_GPC_HEADER, context.globalPrivacyControl);
  } else headers.delete(SEC_GPC_HEADER);
  if (context.storefrontOrigin) {
    headers.set(SHOPIFY_STOREFRONT_ORIGIN_HEADER, context.storefrontOrigin);
  } else headers.delete(SHOPIFY_STOREFRONT_ORIGIN_HEADER);
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
