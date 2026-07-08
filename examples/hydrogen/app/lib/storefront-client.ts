import { getBuyerIp } from "@shared/buyer-ip";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  Cache as HydrogenCache,
  createStorefrontClient,
  type GraphQLFormattedError,
  type RequestScopedPrivateStorefrontClient,
  type CachingStrategy,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";

import type { I18nLocale } from "~/lib/i18n";

type CreateStorefrontClientOptions = {
  request: Request;
  env: Env;
  cache: Cache;
  waitUntil: ExecutionContext["waitUntil"];
  i18n: I18nLocale;
  shopifyRequestContext: ShopifyRequestContext;
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

type StorefrontQueryResult<Doc extends StorefrontDocument> = DocumentResult<Doc> &
  Record<string, unknown> & {
    errors?: GraphQLFormattedError[];
  };

type StorefrontDocumentGraphql = <Doc extends StorefrontDocument>(
  query: Doc,
  options?: { variables?: Record<string, unknown>; cache?: CachingStrategy },
) => Promise<{
  data: Partial<DocumentResult<Doc>> | null;
  errors?: GraphQLFormattedError[];
  headers: Headers;
}>;

export type StorefrontClient = RequestScopedPrivateStorefrontClient & {
  i18n: I18nLocale;
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
  return HydrogenCache({
    maxAge: 1,
    staleWhileRevalidate: 86_399,
  });
}

export function createStorefrontClientForRequest({
  request,
  env,
  cache,
  waitUntil,
  i18n,
  shopifyRequestContext,
}: CreateStorefrontClientOptions): StorefrontClient {
  const client = createStorefrontClient({
    type: "private",
    requestContext: shopifyRequestContext,
    config: {
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      privateStorefrontToken: getPrivateStorefrontToken(env),
      buyerIp: getBuyerIp(request.headers),
      cache,
      waitUntil,
    },
  });

  const graphqlDocument = client.graphql as StorefrontDocumentGraphql;

  async function query<Doc extends StorefrontDocument>(
    queryText: Doc,
    options?: StorefrontQueryOptions,
  ): Promise<StorefrontQueryResult<Doc>> {
    const result = await graphqlDocument(queryText, {
      variables: options?.variables,
      cache: options?.cache ?? CacheDefault(),
    });
    const data = (result.data ?? {}) as DocumentResult<Doc>;
    return (
      result.errors ? { ...data, errors: result.errors } : data
    ) as StorefrontQueryResult<Doc>;
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
    i18n: shopifyRequestContext.i18n,
    requestContext: shopifyRequestContext,
    graphql: client.graphql,
    mutate,
    query,
  };
}
