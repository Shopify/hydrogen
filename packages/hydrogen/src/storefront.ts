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
import {STOREFRONT_REQUEST_GROUP_ID_HEADER} from './constants';
import {
  CacheNone,
  CacheLong,
  CacheShort,
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
import {warnOnce} from './utils/warning';
import {LIB_VERSION} from './version';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;

export type I18nBase = {
  language: LanguageCode;
  country: CountryCode;
};

/**
 * other description
 */
export type StorefrontClient<TI18n extends I18nBase> = {
  storefront: Storefront<TI18n>;
};

/**
 * some deswcription
 */
export type Storefront<TI18n extends I18nBase = I18nBase> = {
  /** The function to run a query on storefront api. */
  query: <T>(
    query: string,
    payload?: StorefrontCommonOptions & {
      cache?: CachingStrategy;
    },
  ) => Promise<T>;
  /** The function to run a mutation on storefront api. */
  mutate: <T>(
    mutation: string,
    payload?: StorefrontCommonOptions,
  ) => Promise<T>;
  /** The cache instance passed in from the `createStorefrontClient` argument. */
  cache?: Cache;
  /** Re-export of `CacheNone`. */
  CacheNone: typeof CacheNone;
  /** Re-export of `CacheLong`. */
  CacheLong: typeof CacheLong;
  /** Re-export of `CacheShort`. */
  CacheShort: typeof CacheShort;
  /** Re-export of `CacheCustom`. */
  CacheCustom: typeof CacheCustom;
  /** Re-export of `generateCacheControlHeader`. */
  generateCacheControlHeader: typeof generateCacheControlHeader;
  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. See [`getPublicTokenHeaders` in Hydrogen React](/docs/api/hydrogen-react/2023-04/utilities/createstorefrontclient#:~:text=%27graphql%27.-,getPublicTokenHeaders,-(props%3F%3A) for more details. */
  getPublicTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPublicTokenHeaders'];
  /** Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint for API calls made from a server. See [`getPrivateTokenHeaders` in  Hydrogen React](/docs/api/hydrogen-react/2023-04/utilities/createstorefrontclient#:~:text=storefrontApiVersion-,getPrivateTokenHeaders,-(props%3F%3A) for more details.*/
  getPrivateTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPrivateTokenHeaders'];
  /** Creates the fully-qualified URL to your myshopify.com domain. See [`getShopifyDomain` in  Hydrogen React](/docs/api/hydrogen-react/2023-04/utilities/createstorefrontclient#:~:text=StorefrontClientReturn-,getShopifyDomain,-(props%3F%3A) for more details. */
  getShopifyDomain: ReturnType<
    typeof createStorefrontUtilities
  >['getShopifyDomain'];
  /** Creates the fully-qualified URL to your store's GraphQL endpoint. See [`getStorefrontApiUrl` in  Hydrogen React](/docs/api/hydrogen-react/2023-04/utilities/createstorefrontclient#:~:text=storeDomain-,getStorefrontApiUrl,-(props%3F%3A) for more details.*/
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

type StorefrontCommonOptions = {
  variables?: ExecutionArgs['variableValues'] & {
    country?: CountryCode;
    language?: LanguageCode;
  };
  headers?: HeadersInit;
  storefrontApiVersion?: string;
};

export type StorefrontQueryOptions = StorefrontCommonOptions & {
  query: string;
  mutation?: never;
  cache?: CachingStrategy;
};

export type StorefrontMutationOptions = StorefrontCommonOptions & {
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
 *  This function extends `createStorefrontClient` from [Hydrogen React](/docs/api/hydrogen-react/latest/utilities/createstorefrontclient). The additional arguments enable internationalization (i18n), caching, and other features particular to Remix and Oxygen.
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
    buyerIp,
    i18n,
    requestGroupId,
    storefrontId,
    ...clientOptions
  } = options;
  if (!cache) {
    // TODO: should only warn in development
    warnOnce(
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
    buyerIp: storefrontHeaders?.buyerIp || buyerIp,
  });

  defaultHeaders[STOREFRONT_REQUEST_GROUP_ID_HEADER] =
    storefrontHeaders?.requestGroupId || requestGroupId || generateUUID();

  if (storefrontId) defaultHeaders[SHOPIFY_STOREFRONT_ID_HEADER] = storefrontId;
  if (LIB_VERSION) defaultHeaders['user-agent'] = `Hydrogen ${LIB_VERSION}`;

  if (storefrontHeaders && storefrontHeaders.cookie) {
    const cookies = getShopifyCookies(storefrontHeaders.cookie ?? '');

    if (cookies[SHOPIFY_Y])
      defaultHeaders[SHOPIFY_STOREFRONT_Y_HEADER] = cookies[SHOPIFY_Y];
    if (cookies[SHOPIFY_S])
      defaultHeaders[SHOPIFY_STOREFRONT_S_HEADER] = cookies[SHOPIFY_S];
  }

  // Deprecation warning
  if (!storefrontHeaders) {
    warnOnce(
      '"requestGroupId" and "buyerIp" will be deprecated in the next calendar release. Please use "getStorefrontHeaders"',
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
    const requestInit: RequestInit = {
      method: 'POST',
      headers: {...defaultHeaders, ...userHeaders},
      body: JSON.stringify({
        query,
        variables: queryVariables,
      }),
    };

    const [body, response] = await fetchWithServerCache(url, requestInit, {
      cacheInstance: mutation ? undefined : cache,
      cache: cacheOptions || CacheShort(),
      shouldCacheResponse: checkGraphQLErrors,
      waitUntil,
    });

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

      throwError(response, errors);
    }

    const {data, errors} = body as StorefrontApiResponse<T>;

    if (errors?.length) throwError(response, errors, StorefrontApiError);

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
      query: <T>(
        query: string,
        payload?: StorefrontCommonOptions & {cache?: CachingStrategy},
      ) => {
        query = minifyQuery(query);
        if (isMutationRE.test(query))
          throw new Error('storefront.query cannot execute mutations');

        return fetchStorefrontApi<T>({...payload, query});
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
      mutate: <T>(mutation: string, payload?: StorefrontCommonOptions) => {
        mutation = minifyQuery(mutation);
        if (isQueryRE.test(mutation))
          throw new Error('storefront.mutate cannot execute queries');

        return fetchStorefrontApi<T>({...payload, mutation});
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

function throwError<T>(
  response: Response,
  errors: StorefrontApiResponse<T>['errors'],
  ErrorConstructor = Error,
) {
  const reqId = response.headers.get('x-request-id');
  const reqIdMessage = reqId ? ` - Request ID: ${reqId}` : '';

  if (errors) {
    const errorMessages =
      typeof errors === 'string'
        ? errors
        : errors.map((error) => error.message).join('\n');

    throw new ErrorConstructor(errorMessages + reqIdMessage);
  }

  throw new ErrorConstructor(
    `API response error: ${response.status}` + reqIdMessage,
  );
}
