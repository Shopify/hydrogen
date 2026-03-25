// --- Storefront Client (rich wrapper) ---
export {createStorefrontClient, formatAPIResult} from './storefront';
export type {
  Storefront,
  StorefrontClient,
  I18nBase,
  StorefrontApiErrors,
  CreateStorefrontClientOptions,
  StorefrontQueries,
  StorefrontMutations,
} from './storefront';

// --- Cache ---
export {
  CacheNone,
  CacheShort,
  CacheLong,
  CacheCustom,
  CacheDefault,
  generateCacheControlHeader,
} from './cache/strategies';
export type {CachingStrategy, AllCacheOptions} from './cache/strategies';
export {InMemoryCache} from './cache/in-memory';
export {createWithCache} from './cache/create-with-cache';
export type {WithCache} from './cache/create-with-cache';

// --- Types ---
export type {
  StorefrontApiResponseOk,
  StorefrontApiResponseOkPartial,
  StorefrontApiResponse,
  StorefrontApiResponsePartial,
  StorefrontApiResponseError,
} from './storefront-api-response.types';
export type {StorefrontHeaders, WaitUntil} from './types';

// --- Constants ---
export {
  SFAPI_VERSION,
  SHOPIFY_STOREFRONT_ID_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
  SHOPIFY_Y,
  SHOPIFY_S,
  SHOPIFY_VISIT_TOKEN_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  STOREFRONT_REQUEST_GROUP_ID_HEADER,
  STOREFRONT_ACCESS_TOKEN_HEADER,
  SDK_VARIANT_HEADER,
  SDK_VARIANT_SOURCE_HEADER,
  SDK_VERSION_HEADER,
  SHOPIFY_CLIENT_IP_HEADER,
  SHOPIFY_CLIENT_IP_SIG_HEADER,
  HYDROGEN_SFAPI_PROXY_KEY,
  HYDROGEN_SERVER_TRACKING_KEY,
} from './constants';

// --- Server Routes ---
export {hydrogenServerRoutes} from './server-routes';
export type {HydrogenServerRoutesOptions} from './server-routes';

// --- Codegen ---
export {storefrontApiCustomScalars} from './codegen.helpers';

// --- Utils ---
export {getStorefrontHeaders} from './utils/request';
export type {CrossRuntimeRequest} from './utils/request';
