export const CACHE_CONTROL_HEADER = "Cache-Control";
export const HYDROGEN_VERSION_HEADER = "X-Hydrogen-Version";
export const SERVER_TIMING_HEADER = "Server-Timing";
export const SURROGATE_CONTROL_HEADER = "Surrogate-Control";
export const REQUEST_GROUP_ID_HEADER = "Custom-Storefront-Request-Group-ID";
export const SDK_VARIANT_HEADER = "X-SDK-Variant";
export const SDK_VARIANT_SOURCE_HEADER = "X-SDK-Variant-Source";
export const SDK_VERSION_HEADER = "X-SDK-Version";
export const SHOPIFY_CHAT_FRAME_ORIGIN_HEADER = "Sec-Shopify-Chat-Frame-Origin";
export const SHOPIFY_CLIENT_IP_HEADER = "X-Shopify-Client-IP";
export const SHOPIFY_STOREFRONT_ORIGIN_HEADER = "Sec-Shopify-Storefront-Origin";
export const SHOPIFY_STOREFRONT_S_HEADER = "Shopify-Storefront-S";
export const SHOPIFY_STOREFRONT_Y_HEADER = "Shopify-Storefront-Y";
export const SHOPIFY_UNIQUE_TOKEN_HEADER = "X-Shopify-UniqueToken";
export const SHOPIFY_VISIT_TOKEN_HEADER = "X-Shopify-VisitToken";
export const STOREFRONT_ACCESS_TOKEN_HEADER = "X-Shopify-Storefront-Access-Token";
export const STOREFRONT_BUYER_IP_HEADER = "Shopify-Storefront-Buyer-IP";
export const STOREFRONT_PRIVATE_TOKEN_HEADER = "Shopify-Storefront-Private-Token";
export const STOREFRONT_URL_HEADER = "x-storefront-url";

export type StandardHeaderName =
  | "accept"
  | "accept-encoding"
  | "accept-language"
  | "access-control-request-headers"
  | "access-control-request-method"
  | typeof CACHE_CONTROL_HEADER
  | "connection"
  | "content-length"
  | "content-type"
  | "cookie"
  | "host"
  | "keep-alive"
  | "origin"
  | "proxy-authenticate"
  | "proxy-authorization"
  | "referer"
  | typeof SERVER_TIMING_HEADER
  | typeof SURROGATE_CONTROL_HEADER
  | "te"
  | "trailer"
  | "transfer-encoding"
  | "upgrade"
  | "user-agent"
  | "x-requested-with";

export type ShopifyHeaderName =
  | typeof HYDROGEN_VERSION_HEADER
  | typeof REQUEST_GROUP_ID_HEADER
  | typeof SDK_VARIANT_HEADER
  | typeof SDK_VARIANT_SOURCE_HEADER
  | typeof SDK_VERSION_HEADER
  | typeof SHOPIFY_CHAT_FRAME_ORIGIN_HEADER
  | typeof SHOPIFY_CLIENT_IP_HEADER
  | typeof SHOPIFY_STOREFRONT_ORIGIN_HEADER
  | typeof SHOPIFY_STOREFRONT_S_HEADER
  | typeof SHOPIFY_STOREFRONT_Y_HEADER
  | typeof SHOPIFY_UNIQUE_TOKEN_HEADER
  | typeof SHOPIFY_VISIT_TOKEN_HEADER
  | typeof STOREFRONT_ACCESS_TOKEN_HEADER
  | typeof STOREFRONT_BUYER_IP_HEADER
  | typeof STOREFRONT_PRIVATE_TOKEN_HEADER
  | typeof STOREFRONT_URL_HEADER;

type KnownHeaderName = StandardHeaderName | ShopifyHeaderName;

export function defineHeaderList<const HeaderNames extends readonly KnownHeaderName[]>(
  ...headerNames: HeaderNames
): HeaderNames {
  return headerNames;
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

export function applyPrivateResponseCacheHeaders(headers: Headers): void {
  headers.set(CACHE_CONTROL_HEADER, "private, no-store, max-age=0, must-revalidate");
  for (const header of Array.from(headers.keys())) {
    if (
      /^(?:.+-)?cdn-cache-control$/i.test(header) ||
      header.toLowerCase() === SURROGATE_CONTROL_HEADER.toLowerCase()
    ) {
      headers.delete(header);
    }
  }
}

const COMMON_PROXY_HEADER_ALLOWLIST = defineHeaderList(
  "accept",
  "accept-encoding",
  "accept-language",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "user-agent",
);

export const SFAPI_REQUEST_HEADER_ALLOWLIST = defineHeaderList(
  ...COMMON_PROXY_HEADER_ALLOWLIST,
  "content-length",
  "access-control-request-headers",
  "access-control-request-method",
  STOREFRONT_ACCESS_TOKEN_HEADER,
  STOREFRONT_PRIVATE_TOKEN_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
);

export const MCP_REQUEST_HEADER_ALLOWLIST = defineHeaderList(...COMMON_PROXY_HEADER_ALLOWLIST);

export const AGENT_REQUEST_HEADER_ALLOWLIST = defineHeaderList(...COMMON_PROXY_HEADER_ALLOWLIST);

export const AJAX_API_REQUEST_HEADER_ALLOWLIST = defineHeaderList(
  ...COMMON_PROXY_HEADER_ALLOWLIST,
  "content-length",
  "x-requested-with",
);

export const SHOPIFY_API_PROXY_REQUEST_HEADER_DENYLIST = defineHeaderList(
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
);
