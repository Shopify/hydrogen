import { STOREFRONT_API_VERSION } from "./constants";
import {
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

export type { ShopifyCountryCode, ShopifyLanguageCode } from "./i18n/types";

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
   * Marks the final response as private and uncacheable because the response holds customer data.
   * The Customer Account API client and the customer session call the method for you.
   * @internal
   */
  markResponseAsPersonalized(reason: string): void;
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
   * Adds the headers that a Hydrogen storefront needs to the final response. Call the method on each response that your app builds. Responses from `handleShopifyRoutes` and `handleShopifyRedirects` already carry these headers.
   *
   * Append your committed session headers before you call the method. The method makes any response that sets a cookie private and uncacheable. The method also sets the `powered-by` header, makes responses that hold customer data private and uncacheable, and adds eligible Shopify cookies only to non-document responses for methods other than `GET` and `HEAD`.
   */
  applyResponseHeaders(headers: Headers): void;
};

/** The context for one request. Pass the context to Hydrogen's API clients and route handlers for that request. */
export type ShopifyRequestContext<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContextBase & {
    /** The storefront's i18n definition, as passed to `createShopifyRequestContext`. */
    i18n: TI18n;
    /** The locale resolved for this request, with the path prefix it is served under. */
    locale: ShopifyMatchedLocale<TI18n>;
  };

/** A request context that includes the customer's IP address. Private Storefront API clients require this context. */
export type ShopifyRequestContextWithBuyerIp<TI18n extends ShopifyI18n = ShopifyI18n> =
  ShopifyRequestContext<TI18n> & { readonly buyerIp: string };

/** The values that the request context reads from the incoming request. */
type Context<TI18n extends ShopifyI18n = ShopifyI18n> = {
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
  /** The storefront's i18n definition. */
  i18n: TI18n;
  /** The locale resolved for this request. */
  locale: ShopifyMatchedLocale<TI18n>;
  /** Whether the incoming request asks for an HTML document. */
  documentRequest?: boolean;
};

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
  const isConsentManagementRequest = request.headers.get(CONSENT_MANAGEMENT_HEADER) === "1";
  const url = request.url ?? request.headers.get(STOREFRONT_URL_HEADER) ?? undefined;
  const storefrontOrigin = getUrlOrigin(url);
  const locale = input.locale ? resolveSupportedLocale(input.locale, i18n) : matchLocale(url, i18n);
  const context = {
    ...(cookieHeader && { cookie: cookieHeader }),
    globalPrivacyControl: request.headers.get(SEC_GPC_HEADER) ?? undefined,
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

  let capturedCookies: string[] | undefined;
  let personalizedResponseReason: string | undefined;
  let sessionEstablishingReason: string | undefined;

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
