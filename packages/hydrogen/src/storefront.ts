import {
  createStorefrontClient as createStorefrontUtilities,
  getShopifyCookies,
  SHOPIFY_S,
  SHOPIFY_Y,
  SHOPIFY_STOREFRONT_ID_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
  type StorefrontClientProps,
} from '@shopify/hydrogen-react';
import {fetchWithServerCache, checkGraphQLErrors} from './cache/fetch';
import {
  SDK_VARIANT_HEADER,
  SDK_VARIANT_SOURCE_HEADER,
  SDK_VERSION_HEADER,
  STOREFRONT_ACCESS_TOKEN_HEADER,
  STOREFRONT_REQUEST_GROUP_ID_HEADER,
} from './constants';
import {
  CacheNone,
  CacheLong,
  CacheShort,
  CacheDefault,
  CacheCustom,
  generateCacheControlHeader,
  type CachingStrategy,
} from './cache/strategies';
import {generateUUID} from './utils/uuid';
import {parseJSON} from './utils/parse-json';
import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import type {
  ClientReturn,
  ClientVariablesInRestParams,
  GenericVariables,
} from '@shopify/hydrogen-codegen';
import {warnOnce} from './utils/warning';
import {LIB_VERSION} from './version';
import {
  minifyQuery,
  assertQuery,
  assertMutation,
  throwGraphQLError,
  type GraphQLApiResponse,
  type GraphQLErrorOptions,
} from './utils/graphql';
import {getCallerStackLine} from './utils/callsites';

export type I18nBase = {
  language: LanguageCode;
  country: CountryCode;
};

export type StorefrontApiErrors = unknown[];
export type StorefrontError = {
  errors?: StorefrontApiErrors;
}

/**
 * Wraps all the returned utilities from `createStorefrontClient`.
 */
export type StorefrontClient<TI18n extends I18nBase> = {
  storefront: Storefront<TI18n>;
};

/**
 * Maps all the queries found in the project to variables and return types.
 */
export interface StorefrontQueries {
  // Example of how a generated query type looks like:
  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};
}

/**
 * Maps all the mutations found in the project to variables and return types.
 */
export interface StorefrontMutations {
  // Example of how a generated mutation type looks like:
  // '#graphql mutation m1 {...}': {return: M1Mutation; variables: M1MutationVariables};
}

// These are the variables that are automatically added to the storefront API.
// We use this type to make parameters optional in storefront client
// when these are the only variables that can be passed.
type AutoAddedVariableNames = 'country' | 'language';

type StorefrontCommonExtraParams = {
  headers?: HeadersInit;
  storefrontApiVersion?: string;
  displayName?: string;
};

/**
 * Interface to interact with the Storefront API.
 */
export type Storefront<TI18n extends I18nBase = I18nBase> = {
  /** The function to run a query on Storefront API. */
  query: <
    OverrideReturnType extends any = never,
    RawGqlString extends string = string,
  >(
    query: RawGqlString,
    ...options: ClientVariablesInRestParams<
      StorefrontQueries,
      RawGqlString,
      StorefrontCommonExtraParams & Pick<StorefrontQueryOptions, 'cache'>,
      AutoAddedVariableNames
    >
  ) => Promise<
    ClientReturn<StorefrontQueries, RawGqlString, OverrideReturnType>
  >;
  /** The function to run a mutation on Storefront API. */
  mutate: <
    OverrideReturnType extends any = never,
    RawGqlString extends string = string,
  >(
    mutation: RawGqlString,
    ...options: ClientVariablesInRestParams<
      StorefrontMutations,
      RawGqlString,
      StorefrontCommonExtraParams,
      AutoAddedVariableNames
    >
  ) => Promise<
    ClientReturn<StorefrontMutations, RawGqlString, OverrideReturnType>
  >;
  /** The cache instance passed in from the `createStorefrontClient` argument. */
  cache?: Cache;
  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-10/utilities/cachenone). */
  CacheNone: typeof CacheNone;
  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-10/utilities/cachelong). */
  CacheLong: typeof CacheLong;
  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-10/utilities/cacheshort). */
  CacheShort: typeof CacheShort;
  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-10/utilities/cachecustom). */
  CacheCustom: typeof CacheCustom;
  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-10/utilities/generatecachecontrolheader). */
  generateCacheControlHeader: typeof generateCacheControlHeader;
  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-10/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */
  getPublicTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPublicTokenHeaders'];
  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-10/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/
  getPrivateTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPrivateTokenHeaders'];
  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-10/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */
  getShopifyDomain: ReturnType<
    typeof createStorefrontUtilities
  >['getShopifyDomain'];
  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-10/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/
  getApiUrl: ReturnType<
    typeof createStorefrontUtilities
  >['getStorefrontApiUrl'];
  /** Determines if the error is resulted from a Storefront API call. */
  isApiError: (error: any) => boolean;
  /** The `i18n` object passed in from the `createStorefrontClient` argument. */
  i18n: TI18n;
};

type HydrogenClientProps<TI18n> = {
  /** Storefront API headers. If on Oxygen, use `getStorefrontHeaders()` */
  storefrontHeaders?: StorefrontHeaders;
  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */
  cache?: Cache;
  /** The globally unique identifier for the Shop */
  storefrontId?: string;
  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil?: ExecutionContext['waitUntil'];
  /** An object containing a country code and language code */
  i18n?: TI18n;
};

export type CreateStorefrontClientOptions<TI18n extends I18nBase> =
  HydrogenClientProps<TI18n> & StorefrontClientProps;

type StorefrontHeaders = {
  /** A unique ID that correlates all sub-requests together. */
  requestGroupId: string | null;
  /** The IP address of the client. */
  buyerIp: string | null;
  /** The cookie header from the client  */
  cookie: string | null;
  /** The purpose header value for debugging */
  purpose: string | null;
};

type StorefrontQueryOptions = StorefrontCommonExtraParams & {
  query: string;
  mutation?: never;
  cache?: CachingStrategy;
};

type StorefrontMutationOptions = StorefrontCommonExtraParams & {
  query?: never;
  mutation: string;
  cache?: never;
};

export const StorefrontApiError = class extends Error {} as ErrorConstructor;
export const isStorefrontApiError = (error: any) =>
  error instanceof StorefrontApiError;

const defaultI18n: I18nBase = {language: 'EN', country: 'US'};

/**
 *  This function extends `createStorefrontClient` from [Hydrogen React](/docs/api/hydrogen-react/2023-10/utilities/createstorefrontclient). The additional arguments enable internationalization (i18n), caching, and other features particular to Remix and Oxygen.
 *
 *  Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).
 */
export function createStorefrontClient<TI18n extends I18nBase>(
  options: CreateStorefrontClientOptions<TI18n>,
): StorefrontClient<TI18n> {
  const {
    storefrontHeaders,
    cache,
    waitUntil,
    i18n,
    storefrontId,
    ...clientOptions
  } = options;
  const H2_PREFIX_WARN = '[h2:warn:createStorefrontClient] ';

  if (process.env.NODE_ENV === 'development' && !cache) {
    warnOnce(
      H2_PREFIX_WARN +
        'Storefront API client created without a cache instance. This may slow down your sub-requests.',
    );
  }

  const {
    getPublicTokenHeaders,
    getPrivateTokenHeaders,
    getStorefrontApiUrl,
    getShopifyDomain,
  } = createStorefrontUtilities(clientOptions);

  const getHeaders = clientOptions.privateStorefrontToken
    ? getPrivateTokenHeaders
    : getPublicTokenHeaders;

  const defaultHeaders = getHeaders({
    contentType: 'json',
    buyerIp: storefrontHeaders?.buyerIp || '',
  });

  defaultHeaders[STOREFRONT_REQUEST_GROUP_ID_HEADER] =
    storefrontHeaders?.requestGroupId || generateUUID();

  if (storefrontId) defaultHeaders[SHOPIFY_STOREFRONT_ID_HEADER] = storefrontId;
  if (LIB_VERSION) defaultHeaders['user-agent'] = `Hydrogen ${LIB_VERSION}`;

  if (storefrontHeaders && storefrontHeaders.cookie) {
    const cookies = getShopifyCookies(storefrontHeaders.cookie ?? '');

    if (cookies[SHOPIFY_Y])
      defaultHeaders[SHOPIFY_STOREFRONT_Y_HEADER] = cookies[SHOPIFY_Y];
    if (cookies[SHOPIFY_S])
      defaultHeaders[SHOPIFY_STOREFRONT_S_HEADER] = cookies[SHOPIFY_S];
  }

  // Remove any headers that are identifiable to the user or request
  const cacheKeyHeader = JSON.stringify({
    'content-type': defaultHeaders['content-type'],
    'user-agent': defaultHeaders['user-agent'],
    [SDK_VARIANT_HEADER]: defaultHeaders[SDK_VARIANT_HEADER],
    [SDK_VARIANT_SOURCE_HEADER]: defaultHeaders[SDK_VARIANT_SOURCE_HEADER],
    [SDK_VERSION_HEADER]: defaultHeaders[SDK_VERSION_HEADER],
    [STOREFRONT_ACCESS_TOKEN_HEADER]:
      defaultHeaders[STOREFRONT_ACCESS_TOKEN_HEADER],
  });

  async function fetchStorefrontApi<T = any>({
    query,
    mutation,
    variables,
    cache: cacheOptions,
    headers = [],
    storefrontApiVersion,
    displayName,
  }: {variables?: GenericVariables} & (
    | StorefrontQueryOptions
    | StorefrontMutationOptions
  )): Promise<T & {error: StorefrontError}> {
    const userHeaders =
      headers instanceof Headers
        ? Object.fromEntries(headers.entries())
        : Array.isArray(headers)
        ? Object.fromEntries(headers)
        : headers;

    query = query ?? mutation;

    const queryVariables = {...variables};

    if (i18n) {
      if (!variables?.country && /\$country/.test(query)) {
        queryVariables.country = i18n.country;
      }

      if (!variables?.language && /\$language/.test(query)) {
        queryVariables.language = i18n.language;
      }
    }

    const url = getStorefrontApiUrl({storefrontApiVersion});
    const graphqlData = JSON.stringify({query, variables: queryVariables});
    const requestInit = {
      method: 'POST',
      headers: {...defaultHeaders, ...userHeaders},
      body: graphqlData,
    } satisfies RequestInit;

    const cacheKey = [
      url,
      requestInit.method,
      cacheKeyHeader,
      requestInit.body,
    ];

    let stackOffset = 1;
    if (process.env.NODE_ENV === 'development') {
      if (/fragment CartApi(Query|Mutation) on Cart/.test(query)) {
        // The cart handler is wrapping storefront.query/mutate,
        // so we need to go up one more stack frame to show
        // the caller in /subrequest-profiler
        stackOffset = 2;
      }
    }

    const [body, response] = await fetchWithServerCache(url, requestInit, {
      cacheInstance: mutation ? undefined : cache,
      cache: cacheOptions || CacheDefault(),
      cacheKey,
      shouldCacheResponse: checkGraphQLErrors,
      waitUntil,
      debugInfo: {
        graphql: graphqlData,
        requestId: requestInit.headers[STOREFRONT_REQUEST_GROUP_ID_HEADER],
        purpose: storefrontHeaders?.purpose,
        stackInfo: getCallerStackLine?.(stackOffset),
        displayName,
      },
    });

    const errorOptions: GraphQLErrorOptions<T> = {
      response,
      type: mutation ? 'mutation' : 'query',
      query,
      queryVariables,
      errors: undefined,
    };

    if (!response.ok) {
      /**
       * The Storefront API might return a string error, or a JSON-formatted {error: string}.
       * We try both and conform them to a single {errors} format.
       */
      let errors;
      try {
        errors = parseJSON(body);
      } catch (_e) {
        errors = [{message: body}];
      }

      // throwGraphQLError({...errorOptions, errors});
      return {error: {
        response: {
          status: response.status,
          url,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
        },
        errors,
      }} as T & {error: StorefrontError};
    }

    const {data, errors} = body as GraphQLApiResponse<T>;

    return {...data, error: {errors}} as T & {error: StorefrontError};
  }

  return {
    storefront: {
      /**
       * Sends a GraphQL query to the Storefront API.
       *
       * Example:
       *
       * ```js
       * async function loader ({context: {storefront}}) {
       *   const data = await storefront.query('query { ... }', {
       *     variables: {},
       *     cache: storefront.CacheLong()
       *   });
       * }
       * ```
       */
      query(query, options?) {
        query = minifyQuery(query);
        assertQuery(query, 'storefront.query');

        const result = fetchStorefrontApi({
          ...options,
          query,
        });

        // This is a no-op, but we need to catch the promise to avoid unhandled rejections
        // we cannot return the catch no-op, or it would swallow the error
        result.catch(() => {});

        return result;
      },
      /**
       * Sends a GraphQL mutation to the Storefront API.
       *
       * Example:
       *
       * ```js
       * async function loader ({context: {storefront}}) {
       *   await storefront.mutate('mutation { ... }', {
       *     variables: {},
       *   });
       * }
       * ```
       */
      mutate(mutation, options?) {
        mutation = minifyQuery(mutation);
        assertMutation(mutation, 'storefront.mutate');

        const result = fetchStorefrontApi({
          ...options,
          mutation,
        });

        // This is a no-op, but we need to catch the promise to avoid unhandled rejections
        // we cannot return the catch no-op, or it would swallow the error
        result.catch(() => {});

        return result;
      },
      cache,
      CacheNone,
      CacheLong,
      CacheShort,
      CacheCustom,
      generateCacheControlHeader,
      getPublicTokenHeaders,
      getPrivateTokenHeaders,
      getShopifyDomain,
      getApiUrl: getStorefrontApiUrl,
      /**
       * Wether it's a GraphQL error returned in the Storefront API response.
       *
       * Example:
       *
       * ```js
       * async function loader ({context: {storefront}}) {
       *   try {
       *     await storefront.query(...);
       *   } catch(error) {
       *     if (storefront.isApiError(error)) {
       *       // ...
       *     }
       *
       *     throw error;
       *   }
       * }
       * ```
       */
      isApiError: isStorefrontApiError,
      i18n: (i18n ?? defaultI18n) as TI18n,
    },
  };
}
