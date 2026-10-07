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

/** The locale for a request: its language, country, and optional localized path prefix. */
export type I18nConfig = {
  /** The request's language. Creating a request context without one throws. */
  language: ShopifyLanguageCode;
  /** The request's country. Creating a request context without one throws. */
  country: ShopifyCountryCode;
  /**
   * The app route prefix for localized paths, for example `"/es-es"`. Hydrogen applies it to standard route redirects and product variant URLs.
   */
  pathPrefix?: string;
};

/** The request's locale with the path prefix normalized to a string. */
type NormalizedI18nConfig<I18n extends I18nConfig = I18nConfig> = Omit<I18n, "pathPrefix"> & {
  pathPrefix: string;
};

/** The incoming request and locale that create a request context. */
type ShopifyRequestContextInputBase<I18n extends I18nConfig = I18nConfig> = {
  /**
   * Pass the framework's `Request` when one exists. When the framework exposes no request, such as during prerendering, pass `{ headers: new Headers() }`.
   */
  request: StorefrontRequest;
  /** The request's language and country, and an optional path prefix for localized routes. */
  i18n: I18n;
};

type ShopifyRequestContextInput<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextInputBase<I18n> & { buyerIp?: never };

type ShopifyRequestContextWithBuyerIpInput<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextInputBase<I18n> & { buyerIp: string };

/** The request context fields and methods that every request context has. */
type ShopifyRequestContextBase = {
  // -- Private fields --
  /**
   * A compile-time brand that limits request contexts to those that createShopifyRequestContext returns.
   * @internal
   */
  readonly __hydrogenShopifyRequestContextBrand: never;
  /**
   * The incoming request's cookie header, forwarded on storefront subrequests.
   * @internal
   */
  cookie?: string;
  /**
   * The customer's trusted IP address, which private Storefront API clients require.
   * @internal
   */
  readonly buyerIp?: string;
  /**
   * The ID that groups this request's subrequests, read from request headers or generated.
   * @internal
   */
  requestGroupId: string;
  /** @internal */
  signal?: AbortSignal;
  /**
   * The incoming request's URL.
   * @internal
   */
  url?: string;
  /**
   * The origin of the incoming request's URL, forwarded on storefront subrequests.
   * @internal
   */
  storefrontOrigin?: string;
  /**
   * Sets the Hydrogen SDK headers, the request group ID, and the incoming cookie, Global Privacy
   * Control, and storefront origin headers on a Storefront API subrequest.
   * @internal
   */
  applyStorefrontRequestHeaders(headers: Headers): void;
  /**
   * Saves the `set-cookie` headers from the first Storefront API response that sets cookies, for
   * replay on the final response.
   * @internal
   */
  captureSubrequestHeaders(headers: Headers): void;
  /**
   * Saves the cookies from a proxied Storefront API response, then removes `set-cookie` from that
   * response.
   * @internal
   */
  consumeStorefrontResponseHeaders(headers: Headers): void;
  /**
   * Marks the final response as private and uncacheable because it depends on customer state. The
   * method keeps the first reason.
   * @internal
   */
  markResponseAsPersonalized(reason: string): void;
  /**
   * Marks the request as an endpoint that can start a Shopify session, such as the consent flow.
   * The final response can then return Shopify cookies without an existing session cookie, and
   * becomes private and uncacheable.
   * @internal
   */
  markResponseAsSessionEstablishing(reason: string): void;

  // -- Public fields --
  /** The request's locale, with the path prefix normalized. */
  i18n: NormalizedI18nConfig;
  /** Returns the incoming request headers plus the Shopify request headers, for handing a request to a proxy or origin. */
  getForwardedRequestHeaders(): Headers;
  /**
   * Applies the response headers that a Hydrogen storefront needs. Call the method on the final response.
   *
   * Append committed session headers first, because the method marks any response that sets a cookie as private and uncacheable. The method sets the `powered-by` header and marks personalized responses as private and uncacheable. The method replays eligible Storefront API cookies only on non-document responses to requests other than GET and HEAD.
   */
  applyResponseHeaders(headers: Headers): void;
};

/** The per-request context that Storefront API clients, Customer Account API clients, and route handlers share. */
export type ShopifyRequestContext<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContextBase & {
    i18n: NormalizedI18nConfig<I18n>;
  };

/** A request context created with the customer's IP address, as private Storefront API clients require. */
export type ShopifyRequestContextWithBuyerIp<I18n extends I18nConfig = I18nConfig> =
  ShopifyRequestContext<I18n> & { readonly buyerIp: string };

/** The request values that the request context reads once from the incoming request. */
type Context<I18n extends I18nConfig = I18nConfig> = {
  /** The incoming request's cookie header. */
  cookie?: string;
  /** The incoming request's Global Privacy Control header value. */
  globalPrivacyControl?: string;
  /** The customer's trusted IP address. */
  buyerIp?: string;
  /** The ID that groups this request's subrequests, read from request headers or generated. */
  requestGroupId: string;
  signal?: AbortSignal;
  /** The incoming request's URL. */
  url?: string;
  /** The origin of the incoming request's URL. */
  storefrontOrigin?: string;
  /** The request's locale, with the path prefix normalized. */
  i18n: NormalizedI18nConfig<I18n>;
  /** Whether the incoming request asks for an HTML document. */
  documentRequest?: boolean;
};

/**
 * Creates the per-request context that Storefront API clients, Customer Account API clients, and
 * route handlers share. The context normalizes the locale and manages the request and response
 * headers that a Shopify storefront needs.
 *
 * Pass `buyerIp` with the customer's trusted IP address. Private Storefront API clients require a buyer IP. The function throws when `i18n` lacks a country or language, and when `buyerIp` is an empty string.
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
 * @param input The incoming request, its locale, and an optional IP address for the customer.
 * @returns The request context to pass to Hydrogen's server APIs for this request.
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
