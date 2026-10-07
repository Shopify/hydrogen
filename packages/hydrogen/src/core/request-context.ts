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
  SEC_GPC_HEADER,
  SHOPIFY_STOREFRONT_ORIGIN_HEADER,
  STOREFRONT_URL_HEADER,
} from "./headers";
import { normalizePathPrefix } from "./standard-routes/path";

const SHOPIFY_ESSENTIAL_COOKIE = "_shopify_essential";

/** The incoming request's headers, plus its method, abort signal, and URL when the framework provides them. */
type StorefrontRequest = Pick<Request, "headers"> &
  Partial<Pick<Request, "method" | "signal" | "url">>;

/** A language code that both the Storefront API and the Customer Account API accept. */
export type ShopifyLanguageCode = Extract<StorefrontLanguageCode, CustomerAccountLanguageCode>;
/** A country code that both the Storefront API and the Customer Account API accept. */
export type ShopifyCountryCode = Extract<StorefrontCountryCode, CustomerAccountCountryCode>;

/** The language, country, and optional localized path prefix for a request. */
export type I18nConfig = {
  /** The request's language. */
  language: ShopifyLanguageCode;
  /** The request's country. */
  country: ShopifyCountryCode;
  /**
   * The URL prefix for localized routes, such as `"/es-es"`. Hydrogen adds the prefix to standard route redirects and product variant URLs.
   */
  pathPrefix?: string;
};

/** The request's locale, with a path prefix that starts with `/` or is an empty string. */
type NormalizedI18nConfig<I18n extends I18nConfig = I18nConfig> = Omit<I18n, "pathPrefix"> & {
  pathPrefix: string;
};

/** The incoming request and its locale. */
type ShopifyRequestContextInputBase<I18n extends I18nConfig = I18nConfig> = {
  /**
   * The incoming request from your framework. When the framework exposes no request, such as during prerendering, pass `{ headers: new Headers() }`.
   */
  request: StorefrontRequest;
  /** The request's language, country, and optional localized path prefix. */
  i18n: I18n;
};

type ShopifyRequestContextInput<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextInputBase<I18n> & { buyerIp?: never };

type ShopifyRequestContextWithBuyerIpInput<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextInputBase<I18n> & { buyerIp: string };

/** The fields and methods on every request context. */
type ShopifyRequestContextBase = {
  // -- Private fields --
  /**
   * A type-only marker. Create request contexts only with createShopifyRequestContext.
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
   * from that response. The API proxies in handleShopifyRoutes call the method for you.
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
  /** The request's language, country, and path prefix. The path prefix starts with `/` and has no trailing slash, or is an empty string when you don't set one. */
  i18n: NormalizedI18nConfig;
  /** Returns the incoming request's headers with Shopify's request headers added. Pass the headers when you forward the request to a proxy or another origin. */
  getForwardedRequestHeaders(): Headers;
  /**
   * Adds the headers that a Hydrogen storefront needs to the final response. Call the method on each response that your app builds. Responses from handleShopifyRoutes and handleShopifyRedirects already carry these headers.
   *
   * Append your committed session headers before you call the method. The method makes any response that sets a cookie private and uncacheable. The method also sets the `powered-by` header, makes responses that hold customer data private and uncacheable, and adds eligible Shopify cookies only to non-document responses for methods other than `GET` and `HEAD`.
   */
  applyResponseHeaders(headers: Headers): void;
};

/** The context for one request. Pass the context to Hydrogen's API clients and route handlers for that request. */
export type ShopifyRequestContext<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextBase & {
    i18n: NormalizedI18nConfig<I18n>;
  };

/** A request context that includes the customer's IP address. Private Storefront API clients require this context. */
export type ShopifyRequestContextWithBuyerIp<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContext<I18n> & { readonly buyerIp: string };

/** The values that the request context reads from the incoming request. */
type Context<I18n extends I18nConfig = I18nConfig> = {
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
  /** The request's language, country, and path prefix. */
  i18n: NormalizedI18nConfig<I18n>;
  /** Whether the incoming request asks for an HTML document. */
  documentRequest?: boolean;
};

/**
 * Creates the context for one incoming request. Pass the same context to the Storefront API
 * client, the Customer Account API client, and handleShopifyRoutes. The context forwards the
 * customer's cookies, locale, and privacy signal to Shopify, and adds Shopify's cookies and cache
 * headers to your response.
 *
 * Call `applyResponseHeaders()` on each response that your app builds. Pass `buyerIp` with the customer's trusted IP address when you use a private Storefront API client. The function throws when `i18n` lacks a country or language, and when `buyerIp` is an empty string.
 *
 * @publicDocs
 */
export function createShopifyRequestContext<const I18n extends I18nConfig>(
  input: ShopifyRequestContextWithBuyerIpInput<I18n>,
): ShopifyRequestContextWithBuyerIp<I18n>;
export function createShopifyRequestContext<const I18n extends I18nConfig>(
  input: ShopifyRequestContextInput<I18n>,
): ShopifyRequestContext<I18n>;
/**
 * @param input The incoming request, its locale, and the customer's IP address for private Storefront API clients.
 * @returns The context to pass to Hydrogen's API clients and route handlers for this request.
 */
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

  const requestMethod = request.method?.toUpperCase();
  const i18n = normalizeI18n(input.i18n);
  const cookieHeader = request.headers.get("cookie") || undefined;
  const inboundCookies = parseCookieHeader(cookieHeader);
  const hasEssentialCookie = inboundCookies.has(SHOPIFY_ESSENTIAL_COOKIE);
  const isConsentManagementRequest = request.headers.get(CONSENT_MANAGEMENT_HEADER) === "1";
  const url = request.url ?? request.headers.get(STOREFRONT_URL_HEADER) ?? undefined;
  const storefrontOrigin = getUrlOrigin(url);
  const context = {
    ...(cookieHeader && { cookie: cookieHeader }),
    globalPrivacyControl: request.headers.get(SEC_GPC_HEADER) ?? undefined,
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
