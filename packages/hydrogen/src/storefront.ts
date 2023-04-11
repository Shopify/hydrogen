import {
  type createStorefrontClient as createStorefrontUtilities,
  getShopifyCookies,
  type StorefrontApiResponseOk,
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
import {createAuthorizer} from '../vendor/storefront-client-js';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;

export type I18nBase = {
  language: LanguageCode;
  country: CountryCode;
};

export type StorefrontClient<TI18n extends I18nBase> = {
  storefront: Storefront<TI18n>;
};

export type Storefront<TI18n extends I18nBase = I18nBase> = {
  query: <T>(
    query: string,
    payload?: StorefrontCommonOptions & {
      cache?: CachingStrategy;
    },
  ) => Promise<T>;
  mutate: <T>(
    mutation: string,
    payload?: StorefrontCommonOptions,
  ) => Promise<T>;
  cache?: Cache;
  CacheNone: typeof CacheNone;
  CacheLong: typeof CacheLong;
  CacheShort: typeof CacheShort;
  CacheCustom: typeof CacheCustom;
  generateCacheControlHeader: typeof generateCacheControlHeader;
  getPublicTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPublicTokenHeaders'];
  getPrivateTokenHeaders: ReturnType<
    typeof createStorefrontUtilities
  >['getPrivateTokenHeaders'];
  getShopifyDomain: ReturnType<
    typeof createStorefrontUtilities
  >['getShopifyDomain'];
  getApiUrl: ReturnType<
    typeof createStorefrontUtilities
  >['getStorefrontApiUrl'];
  isApiError: (error: any) => boolean;
  i18n: TI18n;
};

export type CreateStorefrontClientOptions<TI18n extends I18nBase> = Parameters<
  typeof createStorefrontUtilities
>[0] & {
  storefrontHeaders?: StorefrontHeaders;
  cache?: Cache;
  /** @deprecated use storefrontHeaders instead */
  buyerIp?: string;
  /** @deprecated use storefrontHeaders instead */
  requestGroupId?: string | null;
  storefrontId?: string;
  waitUntil?: ExecutionContext['waitUntil'];
  i18n?: TI18n;
};

type StorefrontHeaders = {
  requestGroupId: string | null;
  buyerIp: string | null;
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

export function createStorefrontClient<TI18n extends I18nBase>({
  storefrontHeaders,
  cache,
  waitUntil,
  buyerIp,
  i18n,
  requestGroupId,
  storefrontId,
  ...clientOptions
}: CreateStorefrontClientOptions<TI18n>): StorefrontClient<TI18n> {
  if (!cache) {
    // TODO: should only warn in development
    warnOnce(
      'Storefront API client created without a cache instance. This may slow down your sub-requests.',
    );
  }

  const authorizer = createAuthorizer({
    storeDomain: clientOptions.storeDomain,
    storefrontAPIVersion: clientOptions.storefrontApiVersion,
    publicAccessToken: clientOptions.publicStorefrontToken,
    privateAccessToken: clientOptions.privateStorefrontToken,
    contentType: clientOptions.contentType,
    sdkVariant: 'Hydrogen',
    sdkVariantSource: 'react',
    sdkVersion: clientOptions.storefrontApiVersion,
  });

  const defaultHeaders = authorizer.getApiHeaders({
    tokenType: clientOptions.privateStorefrontToken ? 'private' : 'public',
    buyerIp,
  }) as Record<string, string>;

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

    const url = authorizer.getApiUrl({apiVersion: storefrontApiVersion});
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
      getPublicTokenHeaders: () =>
        authorizer.getApiHeaders({tokenType: 'public'}) as Record<
          string,
          string
        >,
      getPrivateTokenHeaders: () =>
        authorizer.getApiHeaders({tokenType: 'private'}) as Record<
          string,
          string
        >,
      getShopifyDomain: () => authorizer.config.storeDomain,
      getApiUrl: () => authorizer.getApiUrl(),
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
