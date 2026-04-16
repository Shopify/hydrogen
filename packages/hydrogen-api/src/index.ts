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
export {SFAPI_VERSION} from './storefront-api-constants.js';

// Full server-side storefront client
export {
  createStorefrontClient,
  type CreateStorefrontClientOptions,
  formatAPIResult,
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
  assertMutation,
  assertQuery,
  type GraphQLApiResponse,
  GraphQLError,
  type GraphQLErrorOptions,
  minifyQuery,
  throwErrorWithGqlLink,
} from './utils/graphql.js';

// Hash utility (for building cache keys compatible with runWithCache)
export {hashKey} from './utils/hash.js';

// Request utilities
export {
  type CrossRuntimeRequest,
  extractHeaders,
  getSafePathname,
  getStorefrontHeaders,
  MCP_RE,
  SFAPI_RE,
} from './utils/request.js';
