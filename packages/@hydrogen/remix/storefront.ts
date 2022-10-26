import {
  createStorefrontClient as createStorefrontUtilities,
  type StorefrontApiResponseOk,
} from '@shopify/hydrogen-ui-alpha';
import type {ExecutionArgs} from 'graphql';
import {fetchWithServerCache} from './cache/fetch';
import {STOREFRONT_API_BUYER_IP_HEADER} from './constants';
import {
  CacheNone,
  CacheLong,
  CacheShort,
  CacheCustom,
  type CachingStrategy,
} from './cache/strategies';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;

export type StorefrontClientProps = Parameters<
  typeof createStorefrontUtilities
>[0];

export type Storefront = ReturnType<typeof createStorefrontClient>;

export type HydrogenContext = {
  storefront: Storefront;
  [key: string]: unknown;
};

export function createStorefrontClient(
  clientOptions: StorefrontClientProps,
  {cache, buyerIp}: {cache?: Cache; buyerIp?: string} = {},
) {
  const {getPublicTokenHeaders, getPrivateTokenHeaders, getStorefrontApiUrl} =
    createStorefrontUtilities(clientOptions);

  const defaultHeaders = clientOptions.privateStorefrontToken
    ? getPrivateTokenHeaders()
    : getPublicTokenHeaders();

  defaultHeaders['content-type'] = 'application/json';

  if (buyerIp) defaultHeaders[STOREFRONT_API_BUYER_IP_HEADER] = buyerIp;

  async function getStorefrontData<T>({
    query,
    variables,
    cache: cacheOptions,
    headers = [],
  }: {
    query: string;
    variables: ExecutionArgs['variableValues'];
    cache: CachingStrategy;
    headers?: HeadersInit;
  }): Promise<T> {
    const userHeaders =
      headers instanceof Headers
        ? Object.fromEntries(headers.entries())
        : Array.isArray(headers)
        ? Object.fromEntries(headers)
        : headers;

    const response = await fetchWithServerCache(
      getStorefrontApiUrl(),
      {
        body: JSON.stringify({
          query,
          variables,
        }),
        headers: {...defaultHeaders, ...userHeaders},
        method: 'POST',
      },
      {cache, cacheOptions},
    );

    if (!response.ok) {
      const error = await response.text();

      /**
       * The Storefront API might return a string error, or a JSON-formatted {error: string}.
       * We try both and conform them to a single {errors} format.
       */
      try {
        throwError(response, JSON.parse(error));
      } catch (_e) {
        throwError(response, [{message: error}]);
      }
    }

    const {data, errors} = (await response.json()) as StorefrontApiResponse<T>;

    if (errors) throwError(response, errors);

    return data as T;
  }

  return {
    query: getStorefrontData,
    getPublicTokenHeaders,
    getPrivateTokenHeaders,
    getStorefrontApiUrl,
    cache,
    CacheNone,
    CacheLong,
    CacheShort,
    CacheCustom,
  };
}

function throwError<T>(
  response: Response,
  errors: StorefrontApiResponse<T>['errors'],
) {
  if (errors) {
    const errorMessages =
      typeof errors === 'string'
        ? errors
        : errors.map((error) => error.message).join('\n');

    throw new Error(errorMessages);
  }

  throw new Error(`API response error: ${response.status}`);
}
