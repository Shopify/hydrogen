import {
  createStorefrontClient as createStorefrontUtilities,
  type StorefrontApiResponseOk,
} from '@shopify/hydrogen-react';
import type {ExecutionArgs} from 'graphql';
import {
  FetchCacheOptions,
  fetchWithServerCache,
  checkGraphQLErrors,
} from './cache/fetch';
import {
  STOREFRONT_API_BUYER_IP_HEADER,
  STOREFRONT_REQUEST_GROUP_ID_HEADER,
} from './constants';
import {
  CacheNone,
  CacheLong,
  CacheShort,
  CacheCustom,
  type CachingStrategy,
} from './cache/strategies';
import {generateUUID} from './utils/uuid';
import {parseJSON} from './utils/parse-json';
import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;

export type StorefrontClientProps = Parameters<
  typeof createStorefrontUtilities
>[0] & {
  i18n: {
    language: LanguageCode;
    country: CountryCode;
  };
};

export type Storefront = ReturnType<
  typeof createStorefrontClient
>['storefront'];

export type HydrogenContext = {
  storefront: Storefront;
  [key: string]: unknown;
};

export type CreateStorefrontClientOptions = {
  cache?: Cache;
  buyerIp?: string;
  requestGroupId?: string;
  waitUntil?: ExecutionContext['waitUntil'];
};

type StorefrontCommonOptions = {
  variables?: ExecutionArgs['variableValues'];
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

export function createStorefrontClient(
  clientOptions: StorefrontClientProps,
  {
    cache,
    waitUntil,
    buyerIp,
    requestGroupId = generateUUID(),
  }: CreateStorefrontClientOptions = {},
) {
  const {getPublicTokenHeaders, getPrivateTokenHeaders, getStorefrontApiUrl} =
    createStorefrontUtilities(clientOptions);

  const getHeaders = clientOptions.privateStorefrontToken
    ? getPrivateTokenHeaders
    : getPublicTokenHeaders;

  const defaultHeaders = getHeaders({contentType: 'json'});

  defaultHeaders[STOREFRONT_REQUEST_GROUP_ID_HEADER] = requestGroupId;
  if (buyerIp) defaultHeaders[STOREFRONT_API_BUYER_IP_HEADER] = buyerIp;

  async function callStorefrontApi<T>({
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

    if (!variables?.country && /\$country/.test(query)) {
      queryVariables.country = clientOptions.i18n.country;
    }

    if (!variables?.language && /\$language/.test(query)) {
      queryVariables.language = clientOptions.i18n.language;
    }

    const url = getStorefrontApiUrl({storefrontApiVersion});
    const requestInit = {
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
      query: <T>(
        query: string,
        payload?: StorefrontCommonOptions & {cache?: CachingStrategy},
      ) => {
        query = minifyQuery(query);
        if (isMutationRE.test(query))
          throw new Error('storefront.query cannot execute mutations');

        return callStorefrontApi<T>({...payload, query});
      },
      mutate: <T>(mutation: string, payload?: StorefrontCommonOptions) => {
        mutation = minifyQuery(mutation);
        if (isQueryRE.test(mutation))
          throw new Error('storefront.mutate cannot execute queries');

        return callStorefrontApi<T>({...payload, mutation});
      },
      getPublicTokenHeaders,
      getPrivateTokenHeaders,
      getStorefrontApiUrl,
      cache,
      CacheNone,
      CacheLong,
      CacheShort,
      CacheCustom,
    },
    fetch: (
      url: string,
      {
        hydrogen,
        ...requestInit
      }: RequestInit & {
        hydrogen?: Omit<FetchCacheOptions, 'cacheInstance' | 'waitUntil'>;
      },
    ) =>
      fetchWithServerCache(url, requestInit, {
        waitUntil,
        cacheKey: [url, requestInit],
        cacheInstance: cache,
        ...hydrogen,
      }),
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
