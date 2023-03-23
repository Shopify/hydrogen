import {
  createStorefrontClient as createStorefrontUtilities,
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
import {
  STOREFRONT_API_BUYER_IP_HEADER,
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

export type StorefrontClient<TI18n extends I18nBase> = {
  storefront: Storefront<TI18n>;
};

/**
 * This interface will be augmented in user land with generated query types
 */
export interface QueryTypes {
  // Example of how a generated query type looks like:
  // '#graphql query q1 {...}': {return: Q1Query; variables: Q1QueryVariables};
}

/**
 * This interface will be augmented in user land with generated mutation types
 */
export interface MutationTypes {
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
  RawGqlString extends keyof QueryTypes | string = string,
> = (RawGqlString extends keyof QueryTypes
  ? StorefrontCommonOptions<QueryTypes[RawGqlString]['variables']>
  : StorefrontCommonOptions<GenericVariables>) & {cache?: CachingStrategy};

type StorefrontMutateSecondParam<
  RawGqlString extends keyof MutationTypes | string = string,
> = RawGqlString extends keyof MutationTypes
  ? StorefrontCommonOptions<MutationTypes[RawGqlString]['variables']>
  : StorefrontCommonOptions<GenericVariables>;

export type Storefront<TI18n extends I18nBase = I18nBase> = {
  query: <OverrideReturnType = any, RawGqlString extends string = string>(
    query: RawGqlString,
    ...options: RawGqlString extends keyof QueryTypes // Do we have any generated query types?
      ? IsOptionalVariables<QueryTypes[RawGqlString]> extends true
        ? [StorefrontQuerySecondParam<RawGqlString>?] // Using codegen, query has no variables
        : [StorefrontQuerySecondParam<RawGqlString>] // Using codegen, query needs variables
      : [StorefrontQuerySecondParam?] // No codegen, variables always optional
  ) => Promise<
    RawGqlString extends keyof QueryTypes // Do we have any generated query types?
      ? QueryTypes[RawGqlString]['return'] // Using codegen, return type is known
      : OverrideReturnType // No codegen, let user specify return type
  >;

  mutate: <OverrideReturnType = any, RawGqlString extends string = string>(
    mutation: RawGqlString,
    ...options: RawGqlString extends keyof MutationTypes // Do we have any generated mutation types?
      ? IsOptionalVariables<MutationTypes[RawGqlString]> extends true
        ? [StorefrontMutateSecondParam<RawGqlString>?] // Using codegen, mutation has no variables
        : [StorefrontMutateSecondParam<RawGqlString>] // Using codegen, mutation needs variables
      : [StorefrontMutateSecondParam?] // No codegen, variables always optional
  ) => Promise<
    RawGqlString extends keyof MutationTypes // Do we have any generated mutation types?
      ? MutationTypes[RawGqlString]['return'] // Using codegen, return type is known
      : OverrideReturnType // No codegen, let user specify return type
  >;

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

  const {
    getPublicTokenHeaders,
    getPrivateTokenHeaders,
    getStorefrontApiUrl,
    getShopifyDomain,
  } = createStorefrontUtilities(clientOptions);

  const getHeaders = clientOptions.privateStorefrontToken
    ? getPrivateTokenHeaders
    : getPublicTokenHeaders;

  const defaultHeaders = getHeaders({contentType: 'json'});

  defaultHeaders[STOREFRONT_REQUEST_GROUP_ID_HEADER] =
    storefrontHeaders?.requestGroupId || requestGroupId || generateUUID();

  if (storefrontHeaders?.buyerIp || buyerIp)
    defaultHeaders[STOREFRONT_API_BUYER_IP_HEADER] =
      storefrontHeaders?.buyerIp || buyerIp || '';

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
      query: <Storefront['query']>((query: string, payload) => {
        query = minifyQuery(query);
        if (isMutationRE.test(query))
          throw new Error('storefront.query cannot execute mutations');

        return fetchStorefrontApi({...payload, query});
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
        if (isQueryRE.test(mutation))
          throw new Error('storefront.mutate cannot execute queries');

        return fetchStorefrontApi({...payload, mutation});
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
