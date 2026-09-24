export const STOREFRONT_REQUEST_GROUP_ID_HEADER =
  'Custom-Storefront-Request-Group-ID';
export const STOREFRONT_ACCESS_TOKEN_HEADER =
  'X-Shopify-Storefront-Access-Token';
export const SDK_VARIANT_HEADER = 'X-SDK-Variant';
export const SDK_VARIANT_SOURCE_HEADER = 'X-SDK-Variant-Source';
export const SDK_VERSION_HEADER = 'X-SDK-Version';
export const SHOPIFY_CLIENT_IP_HEADER = 'X-Shopify-Client-IP';
export const SHOPIFY_CLIENT_IP_SIG_HEADER = 'X-Shopify-Client-IP-Sig';
export const HYDROGEN_SFAPI_PROXY_KEY = '_sfapi_proxy';
// Marks the same-origin consent request so the request handler can expire
// deprecated cookies after their values were forwarded upstream.
// NOTE: packages/hydrogen-react/src/useShopifyCookies.tsx defines the same
// header name (CONSENT_MANAGEMENT_MARKER_HEADER) where the request is sent;
// keep the two in sync.
export const STOREFRONT_CONSENT_MANAGEMENT_HEADER =
  'Shopify-Storefront-Consent-Management';
