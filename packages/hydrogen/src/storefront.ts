import {
  createStorefrontClient as createStorefrontUtilities,
  getShopifyCookies,
  type StorefrontApiResponseOk,
  type StorefrontClientProps,
  SHOPIFY_S,
  SHOPIFY_Y,
  SHOPIFY_STOREFRONT_ID_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
} from '@shopify/hydrogen-react';
import type {ExecutionArgs} from 'graphql';
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
  CacheCustom,
  generateCacheControlHeader,
  type CachingStrategy,
} from './cache/strategies';
import {parseJSON} from './utils/parse-json';
import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {warnOnce} from './utils/warning';
import {LIB_VERSION} from './version';
import {
  getHeader,
  getDebugHeaders,
  getClientIp,
  getRequestId,
  type CrossRuntimeRequest,
} from './utils/request';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;

export type I18nBase = {
  language: LanguageCode;
  country: CountryCode;
};

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

// Default type for `variables` in storefront client
type GenericVariables = ExecutionArgs['variableValues'];

// Use this type to make parameters optional in storefront client
// when no variables need to be passed.
type EmptyVariables = {[key: string]: never};

// These are the variables that are automatically added to the storefront API.
// We use this type to make parameters optional in storefront client
// when these are the only variables that can be passed.
type AutoAddedVariableNames = 'country' | 'language';

type IsOptionalVariables<OperationTypeValue extends {variables: any}> = Omit<
  OperationTypeValue['variables'],
  AutoAddedVariableNames
> extends EmptyVariables
  ? true // No need to pass variables
  : GenericVariables extends OperationTypeValue['variables']
  ? true // We don't know what variables are needed
  : false; // Variables are known and required

type StorefrontCommonOptions<Variables extends GenericVariables> = {
  headers?: HeadersInit;
  storefrontApiVersion?: string;
} & (IsOptionalVariables<{variables: Variables}> extends true
  ? {variables?: Variables}
  : {variables: Variables});

type StorefrontQuerySecondParam<
  RawGqlString extends keyof StorefrontQueries | string = string,
> = (RawGqlString extends keyof StorefrontQueries
  ? StorefrontCommonOptions<StorefrontQueries[RawGqlString]['variables']>
  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy};

type StorefrontMutateSecondParam<
  RawGqlString extends keyof StorefrontMutations | string = string,
> = RawGqlString extends keyof StorefrontMutations
  ? StorefrontCommonOptions<StorefrontMutations[RawGqlString]['variables']>
  : StorefrontCommonOptions<GenericVariables>;

/**
 * Interface to interact with the Storefront API.
 */
export type Storefront<TI18n extends I18nBase = I18nBase> = {
  /** The function to run a query on Storefront API. */
  query: <OverrideReturnType = any, RawGqlString extends string = string>(
    query: RawGqlString,
    ...options: RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?
      ? IsOptionalVariables<StorefrontQueries[RawGqlString]> extends true
        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables
        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables
      : [StorefrontQuerySecondParam?] // No codegen, variables always optional
  ) => Promise<
    RawGqlString extends keyof StorefrontQueries // Do we have any generated query types?
      ? StorefrontQueries[RawGqlString]['return'] // Using codegen, return type is known
      : OverrideReturnType // No codegen, let user specify return type
  >;
  /** The function to run a mutation on Storefront API. */
  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(
    mutation: RawGqlString,
    ...options: RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?
      ? IsOptionalVariables<StorefrontMutations[RawGqlString]> extends true
        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables
        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables
      : [StorefrontMutateSecondParam?] // No codegen, variables always optional
  ) => Promise<
    RawGqlString extends keyof StorefrontMutations // Do we have any generated mutation types?
      ? StorefrontMutations[RawGqlString]['return'] // Using codegen, return type is known
      : OverrideReturnType // No codegen, let user specify return type
  >;
  /** The cache instance passed in from the `createStorefrontClient` argument. */
  cache?: Cache;
  /** Re-export of [`CacheNone`](/docs/api/hydrogen/2023-07/utilities/cachenone). */
  CacheNone: typeof CacheNone;
  /** Re-export of [`CacheLong`](/docs/api/hydrogen/2023-07/utilities/cachelong). */
  CacheLong: typeof CacheLong;
  /** Re-export of [`CacheShort`](/docs/api/hydrogen/2023-07/utilities/cacheshort). */
  CacheShort: typeof CacheShort;
  /** Re-export of [`CacheCustom`](/docs/api/hydrogen/2023-07/utilities/cachecustom). */
  CacheCustom: typeof CacheCustom;
  /** Re-export of [`generateCacheControlHeader`](/docs/api/hydrogen/2023-07/utilities/generatecachecontrolheader). */
  generateCacheControlHeader: typeof generateCacheControlHeader;
  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */
  getPublicTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPublicTokenHeaders'];
  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/
  getPrivateTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPrivateTokenHeaders'];
  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */
  getShopifyDomain: ReturnType<
    typeof createStorefrontUtilities
  >['getShopifyDomain'];
  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/
  getApiUrl: ReturnType<
    typeof createStorefrontUtilities
  >['getStorefrontApiUrl'];
  /** Determines if the error is resulted from a Storefront API call. */
  isApiError: (error: any) => boolean;
  /** The `i18n` object passed in from the `createStorefrontClient` argument. */
  i18n: TI18n;
};

type HydrogenClientProps<TI18n> = {
  /** The `request` object is used to access headers for the Storefront API. */
  request?: CrossRuntimeRequest;
  /** @deprecated Storefront API headers. If on Oxygen, use `getStorefrontHeaders()` */
  storefrontHeaders?: StorefrontHeaders;
  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */
  cache?: Cache;
  /** @deprecated use storefrontHeaders instead */
  buyerIp?: string;
  /** @deprecated use storefrontHeaders instead */
  requestGroupId?: string | null;
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
};

type StorefrontQueryOptions = StorefrontQuerySecondParam & {
  query: string;
  mutation?: never;
};

type StorefrontMutationOptions = StorefrontMutateSecondParam & {
  query?: never;
  mutation: string;
  cache?: never;
};

const StorefrontApiError = class extends Error {} as ErrorConstructor;
export const isStorefrontApiError = (error: any) =>
  error instanceof StorefrontApiError;

const isQueryRE = /(^|}\s)query[\s({]/im;
const isMutationRE = /(^|}\s)mutation[\s({]/im;

function minifyQuery(string: string) {
  return string
    .replace(/\s*#.*$/gm, '') // Remove GQL comments
    .replace(/\s+/gm, ' ') // Minify spaces
    .trim();
}

const defaultI18n: I18nBase = {language: 'EN', country: 'US'};

/**
 *  This function extends `createStorefrontClient` from [Hydrogen React](/docs/api/hydrogen-react/2023-07/utilities/createstorefrontclient). The additional arguments enable internationalization (i18n), caching, and other features particular to Remix and Oxygen.
 *
 *  Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).
 */
export function createStorefrontClient<TI18n extends I18nBase>({
  request,
  storefrontHeaders,
  cache,
  waitUntil,
  buyerIp,
  i18n,
  requestGroupId,
  storefrontId,
  ...clientOptions
}: CreateStorefrontClientOptions<TI18n>): StorefrontClient<TI18n> {
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

  // Deprecation warning
  if (process.env.NODE_ENV === 'development' && storefrontHeaders) {
    warnOnce(
      H2_PREFIX_WARN +
        '`storefrontHeaders` will be deprecated in the next calendar release. Please pass `request` instead.',
    );
  }

  if (request) {
    storefrontHeaders = {
      requestGroupId: getRequestId(request),
      buyerIp: getClientIp(request),
      cookie: getHeader(request, 'cookie'),
    };
  }

  const getTokenHeaders = clientOptions.privateStorefrontToken
    ? getPrivateTokenHeaders
    : getPublicTokenHeaders;

  const defaultHeaders = getTokenHeaders({
    contentType: 'json',
    buyerIp: storefrontHeaders?.buyerIp || buyerIp,
  });

  const requestId = storefrontHeaders?.requestGroupId || requestGroupId || null;
  if (requestId) defaultHeaders[STOREFRONT_REQUEST_GROUP_ID_HEADER] = requestId;
  if (storefrontId) defaultHeaders[SHOPIFY_STOREFRONT_ID_HEADER] = storefrontId;
  if (LIB_VERSION) defaultHeaders['user-agent'] = `Hydrogen ${LIB_VERSION}`;

  if (storefrontHeaders?.cookie) {
    const cookies = getShopifyCookies(storefrontHeaders.cookie);

    if (cookies[SHOPIFY_Y])
      defaultHeaders[SHOPIFY_STOREFRONT_Y_HEADER] = cookies[SHOPIFY_Y];
    if (cookies[SHOPIFY_S])
      defaultHeaders[SHOPIFY_STOREFRONT_S_HEADER] = cookies[SHOPIFY_S];
  }

  // Deprecation warning
  if (process.env.NODE_ENV === 'development' && !storefrontHeaders) {
    warnOnce(
      H2_PREFIX_WARN +
        '`requestGroupId` and `buyerIp` will be deprecated in the next calendar release. Please use `getStorefrontHeaders`',
    );
  }

  async function fetchStorefrontApi<T>({
    query,
    mutation,
    variables,
    cache: cacheOptions,
    headers = [],
    storefrontApiVersion,
  }: StorefrontQueryOptions | StorefrontMutationOptions): Promise<T> {
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

    // Remove any headers that are identifiable to the user or request
    const cacheKey = [
      url,
      {
        method: requestInit.method,
        headers: {
          'content-type': defaultHeaders['content-type'],
          'user-agent': defaultHeaders['user-agent'],
          [SDK_VARIANT_HEADER]: defaultHeaders[SDK_VARIANT_HEADER],
          [SDK_VARIANT_SOURCE_HEADER]:
            defaultHeaders[SDK_VARIANT_SOURCE_HEADER],
          [SDK_VERSION_HEADER]: defaultHeaders[SDK_VERSION_HEADER],
          [STOREFRONT_ACCESS_TOKEN_HEADER]:
            defaultHeaders[STOREFRONT_ACCESS_TOKEN_HEADER],
        },
        body: requestInit.body,
      },
    ];

    const [body, response] = await fetchWithServerCache(url, requestInit, {
      cacheInstance: mutation ? undefined : cache,
      cache: cacheOptions || CacheShort(),
      cacheKey,
      shouldCacheResponse: checkGraphQLErrors,
      waitUntil,
      debugInfo: {
        graphql: graphqlData,
        ...getDebugHeaders(request),
      },
    });

    const errorOptions: StorefrontErrorOptions<T> = {
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

      throwError({...errorOptions, errors});
    }

    const {data, errors} = body as StorefrontApiResponse<T>;

    if (errors?.length) {
      throwError({
        ...errorOptions,
        errors,
        ErrorConstructor: StorefrontApiError,
      });
    }

    return data as T;
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
      query: <Storefront['query']>((query: string, payload) => {
        query = minifyQuery(query);
        if (isMutationRE.test(query)) {
          throw new Error(
            '[h2:error:storefront.query] Cannot execute mutations',
          );
        }

        const result = fetchStorefrontApi({
          ...payload,
          query,
        });

        // This is a no-op, but we need to catch the promise to avoid unhandled rejections
        // we cannot return the catch no-op, or it would swallow the error
        result.catch(() => {});

        return result;
      }),
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
      mutate: <Storefront['mutate']>((mutation: string, payload) => {
        mutation = minifyQuery(mutation);
        if (isQueryRE.test(mutation)) {
          throw new Error(
            '[h2:error:storefront.mutate] Cannot execute queries',
          );
        }

        const result = fetchStorefrontApi({
          ...payload,
          mutation,
        });

        // This is a no-op, but we need to catch the promise to avoid unhandled rejections
        // we cannot return the catch no-op, or it would swallow the error
        result.catch(() => {});

        return result;
      }),
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

type StorefrontErrorOptions<T> = {
  response: Response;
  errors: StorefrontApiResponse<T>['errors'];
  type: 'query' | 'mutation';
  query: string;
  queryVariables: Record<string, any>;
  ErrorConstructor?: ErrorConstructor;
};

function throwError<T>({
  response,
  errors,
  type,
  query,
  queryVariables,
  ErrorConstructor = Error,
}: StorefrontErrorOptions<T>) {
  const requestId = response.headers.get('x-request-id');
  const errorMessage =
    (typeof errors === 'string'
      ? errors
      : errors?.map?.((error) => error.message).join('\n')) ||
    `API response error: ${response.status}`;

  throw new ErrorConstructor(
    `[h2:error:storefront.${type}] ` +
      errorMessage +
      (requestId ? ` - Request ID: ${requestId}` : ''),
    {
      cause: JSON.stringify({
        errors,
        requestId,
        ...(process.env.NODE_ENV === 'development' && {
          graphql: {
            query,
            variables: JSON.stringify(queryVariables),
          },
        }),
      }),
    },
  );
}
