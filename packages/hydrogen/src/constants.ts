import {LIB_VERSION} from './version';

export const STOREFRONT_REQUEST_GROUP_ID_HEADER =
  'Custom-Storefront-Request-Group-ID';
export const STOREFRONT_ACCESS_TOKEN_HEADER =
  'X-Shopify-Storefront-Access-Token';
export const SDK_VARIANT_HEADER = 'X-SDK-Variant';
export const SDK_VARIANT_SOURCE_HEADER = 'X-SDK-Variant-Source';
export const SDK_VERSION_HEADER = 'X-SDK-Version';

// For Customer Account API
export const DEFAULT_CUSTOMER_API_VERSION = '2024-04';
export const USER_AGENT = `Shopify Hydrogen ${LIB_VERSION}`;
// This is a static api client id: https://shopify.dev/docs/api/customer#useaccesstoken-propertydetail-audience
export const CUSTOMER_API_CLIENT_ID = '30243aa5-17c1-465a-8493-944bcc4e88aa';
export const CUSTOMER_ACCOUNT_SESSION_KEY = 'customerAccount';
export const BUYER_SESSION_KEY = 'buyer';
