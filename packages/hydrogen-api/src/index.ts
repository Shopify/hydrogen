// Cache strategies
export {
  type AllCacheOptions,
  CacheCustom,
  CacheDefault,
  CacheLong,
  CacheNone,
  CacheShort,
  type CachingStrategy,
  generateCacheControlHeader,
  type NoStoreStrategy,
} from './cache/strategies.js';

// Cache internals for advanced use
export {
  type CacheActionFunctionParam,
  type CacheKey,
  type DebugOptions,
  runWithCache,
} from './cache/run-with-cache.js';

// Server fetch with caching
export {
  type FetchCacheOptions,
  fetchWithServerCache,
} from './cache/server-fetch.js';

// Codegen helpers
export {
  customerAccountApiCustomScalars,
  storefrontApiCustomScalars,
} from './codegen-helpers.js';

// Constants
export {CAAPI_VERSION, SFAPI_VERSION} from './api-constants.js';

// Schema resolution (for graphql-codegen)
export {getSchema, type SchemaApi} from './schema.js';

// Full server-side storefront client
export {
  createStorefrontClient,
  type CreateStorefrontClientOptions,
  type I18nBase,
  type Storefront,
  type StorefrontApiErrors,
  type StorefrontClient,
  type StorefrontMutations,
  type StorefrontQueries,
} from './storefront.js';

// Low-level storefront client (URL/header building)
export {
  createStorefrontClient as createStorefrontUtilities,
  type StorefrontClientProps as StorefrontUtilitiesProps,
  type StorefrontClientReturn as StorefrontUtilitiesReturn,
} from './storefront-client.js';

// Types
export type {StorefrontHeaders, WaitUntil} from './types.js';

// GraphQL utilities
export {
  type GraphQLApiResponse,
  GraphQLError,
  type GraphQLErrorOptions,
} from './utils/graphql.js';

// Hash utility (for building cache keys compatible with runWithCache)
export {hashKey} from './utils/hash.js';

// Request utilities
export {
  type CrossRuntimeRequest,
  getStorefrontHeaders,
} from './utils/request.js';
