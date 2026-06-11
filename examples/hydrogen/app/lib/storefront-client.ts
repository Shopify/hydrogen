import { getBuyerIp } from "@shared/buyer-ip";
import { getPrivateStorefrontToken } from "@shared/private-env";
import type { StorefrontRequestContext } from "@shopify/hydrogen";
import {
  createStorefrontClient,
  type GraphQLFormattedError,
  type RequestScopedPrivateStorefrontClient,
} from "@shopify/hydrogen";
import { CacheLong, createWithCache, type CachingStrategy } from "@shopify/hydrogen-classic";

import type { I18nLocale } from "~/lib/i18n";

type CreateStorefrontClientOptions = {
  request: Request;
  env: Env;
  cache: Cache;
  waitUntil: ExecutionContext["waitUntil"];
  i18n: I18nLocale;
  storefrontRequestContext: StorefrontRequestContext;
};

type StorefrontQueryOptions = {
  variables?: Record<string, unknown>;
  cache?: CachingStrategy;
};

type StorefrontDocument = string;

type DocumentResult<Doc> = "__apiType" extends keyof Doc
  ? Doc extends { readonly __apiType?: (variables: infer _Variables) => infer Result }
    ? Result
    : Record<string, unknown>
  : Record<string, unknown>;

type StorefrontQueryResult<Doc extends StorefrontDocument> = DocumentResult<Doc> & {
  errors?: GraphQLFormattedError[];
};

type StorefrontDocumentGraphql = <Doc extends StorefrontDocument>(
  query: Doc,
  options?: { variables?: Record<string, unknown> },
) => Promise<{
  data: Partial<DocumentResult<Doc>> | null;
  errors?: GraphQLFormattedError[];
  headers: Headers;
}>;

export type StorefrontClient = RequestScopedPrivateStorefrontClient & {
  i18n: I18nLocale;
  CacheLong: typeof CacheLong;
  mutate: <Doc extends StorefrontDocument>(
    query: Doc,
    options?: Omit<StorefrontQueryOptions, "cache">,
  ) => Promise<StorefrontQueryResult<Doc>>;
  query: <Doc extends StorefrontDocument>(
    query: Doc,
    options?: StorefrontQueryOptions,
  ) => Promise<StorefrontQueryResult<Doc>>;
};

function CacheDefault(): CachingStrategy {
  return {
    mode: "public",
    maxAge: 1,
    staleWhileRevalidate: 86_399,
  };
}

export function createStorefrontClientForRequest({
  request,
  env,
  cache,
  waitUntil,
  i18n,
  storefrontRequestContext,
}: CreateStorefrontClientOptions): StorefrontClient {
  const client = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN || getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(request.headers),
      i18n,
      requestContext: storefrontRequestContext,
    },
  });

  const withCache = createWithCache({ cache, waitUntil, request });
  const graphqlDocument = client.graphql as StorefrontDocumentGraphql;

  async function query<Doc extends StorefrontDocument>(
    queryText: Doc,
    options?: StorefrontQueryOptions,
  ): Promise<StorefrontQueryResult<Doc>> {
    const runQuery = async () => {
      const result = await graphqlDocument(queryText, {
        variables: options?.variables,
      });
      const data = (result.data ?? {}) as DocumentResult<Doc>;
      return result.errors ? { ...data, errors: result.errors } : data;
    };

    return withCache.run(
      {
        cacheKey: [client.apiUrl, queryText, options?.variables],
        cacheStrategy: options?.cache ?? CacheDefault(),
        shouldCacheResult: (result) =>
          !(
            result &&
            typeof result === "object" &&
            "errors" in result &&
            Array.isArray(result.errors)
          ),
      },
      () => runQuery(),
    );
  }

  async function mutate<Doc extends StorefrontDocument>(
    queryText: Doc,
    options?: Omit<StorefrontQueryOptions, "cache">,
  ): Promise<StorefrontQueryResult<Doc>> {
    const result = await graphqlDocument(queryText, {
      variables: options?.variables,
    });
    const data = (result.data ?? {}) as DocumentResult<Doc>;
    return result.errors ? { ...data, errors: result.errors } : data;
  }

  return {
    type: client.type,
    storeUrl: client.storeUrl,
    apiUrl: client.apiUrl,
    i18n,
    requestContext: storefrontRequestContext,
    CacheLong,
    graphql: client.graphql,
    mutate,
    query,
  };
}
