import type {
  TadaDocumentNode,
  ResultOf as TadaResultOf,
  VariablesOf as TadaVariablesOf,
} from "gql.tada";

import type { CacheInstance, WaitUntil } from "../core/cache/run-with-cache";
import type {
  ShopifyRequestContext,
  ShopifyRequestContextWithBuyerIp,
} from "../core/request-context";
import type { AnyStorefrontQueryString, SourceOf, StorefrontQueryString } from "../graphql";
import type { InferResult, InferVariables } from "../graphql";
import type { InferOperationKind } from "../graphql/type-resolver";

export type { I18nConfig } from "../core/request-context";

/** A document that the client's GraphQL method accepts, from `gql` or from gql.tada. */
type DocLike = TadaDocumentNode<any, any> | AnyStorefrontQueryString;
/** The typed document that Hydrogen infers from a plain query string. */
type InferredDoc<T extends string> = StorefrontQueryString<InferResult<T>, InferVariables<T>, T>;
/** The typed document for a GraphQL call. Hydrogen infers the types when you pass a plain query string. */
type ResolveDoc<D> = D extends DocLike ? D : D extends string ? InferredDoc<D> : never;
/** The query text of a document as a string literal type. A plain string resolves to itself. */
type SourceText<Doc> = [SourceOf<Doc>] extends [never]
  ? Doc extends string
    ? Doc
    : never
  : SourceOf<Doc>;
/** The operation kind of a document, such as `"query"`. Resolves to `"unknown"` when the query text isn't a string literal type. */
type OperationKindOfDoc<Doc> = [SourceText<Doc>] extends [never]
  ? "unknown"
  : string extends SourceText<Doc>
    ? "unknown"
    : InferOperationKind<SourceText<Doc>>;
/** Offers the `cache` option only for documents that TypeScript recognizes as queries. */
type GraphqlExtraOptionsForDoc<Doc, Extra extends Record<string, unknown>> =
  OperationKindOfDoc<Doc> extends "query" ? Extra : Omit<Extra, "cache">;
/** The result type of a `gql` document or a gql.tada document node. */
type ResultOfDoc<Doc> =
  Doc extends StorefrontQueryString<infer Result, infer _Variables, string>
    ? Result
    : Doc extends TadaDocumentNode<any, any>
      ? TadaResultOf<Doc>
      : never;
type VariablesOfDoc<Doc> =
  Doc extends StorefrontQueryString<infer _Result, infer Variables, string>
    ? Variables
    : Doc extends TadaDocumentNode<any, any>
      ? TadaVariablesOf<Doc>
      : never;
type StorefrontApiResultOf<Doc extends DocLike> = TadaResultOf<Doc>;
type StorefrontApiVariablesOf<Doc extends DocLike> = TadaVariablesOf<Doc>;

/**
 * A GraphQL error from the Storefront API. The result of a GraphQL call lists GraphQL errors
 * in its `errors` field.
 */
export interface GraphQLFormattedError {
  /** The error message. */
  readonly message: string;
  /** The lines and columns in the query where the error occurs. */
  readonly locations?: ReadonlyArray<{ line: number; column: number }>;
  /** The path to the response field that failed. */
  readonly path?: ReadonlyArray<string | number>;
  /** Extra details that the Storefront API adds to the error. */
  readonly extensions?: Record<string, unknown>;
}

type CommonOptions = {
  /**
   * Your store's domain, such as `"my-store.myshopify.com"`. Hydrogen adds `https://` when the
   * domain has no protocol, and removes trailing slashes. createStorefrontClient throws an error
   * for an empty domain.
   */
  storeDomain: string;
  /**
   * Your Hydrogen storefront's ID. The client sends the ID in the `Shopify-Storefront-Id` header
   * of every request.
   */
  storefrontId?: string;
  /**
   * The Storefront API version that the client queries. Defaults to the version that Hydrogen
   * bundles. To send some queries to another version, such as `unstable`, create a second client
   * with that version. Type inference always uses Hydrogen's bundled schema. Write your own types
   * for fields outside the bundled schema.
   */
  apiVersion?: string;
  /**
   * How long a request can run before the client throws a StorefrontTimeoutError, in
   * milliseconds. Defaults to 30,000. Set `0` to turn off the timeout. Stale-while-revalidate
   * refreshes use the same timeout, or 30,000 when the timeout is `0`. createStorefrontClient
   * throws an error for a negative value.
   */
  defaultTimeoutInMs?: number;
  /**
   * The cache that stores query results. The client caches only queries that pass a `cache`
   * strategy. The client never caches mutations or results with GraphQL errors.
   */
  // Mirrored by the `cache?: CacheConfig` inference hole in
  // CreateStorefrontClientArgs — keep the key and type in sync.
  cache?: CacheInstance;
  /** Keeps the runtime alive while the client writes to the cache in the background, such as a worker's `waitUntil` function. Without the function, each cached query waits for its cache write before it resolves. */
  waitUntil?: WaitUntil;
};

/** A fetch function, or any function with a compatible signature that resolves to a `Response`. */
type AnyFetch = typeof globalThis.fetch | ((...args: never[]) => Promise<Response>);

/**
 * Options for a public client, which runs in the browser or a mobile app. Pass a public access
 * token, or omit the token for tokenless access.
 *
 * Tokenless access can't read some Storefront API fields, including product tags, metaobjects,
 * metafields, menus, and customers.
 */
export interface PublicClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** The fetch function that the client calls. Defaults to `globalThis.fetch`. createStorefrontClient throws an error when neither exists. */
  fetch?: Fetch;
  /** Your public Storefront API access token. Omit the token for tokenless access. createStorefrontClient throws an error for an empty string. */
  publicStorefrontToken?: string | undefined;
}

/**
 * Options for a private client, which runs during server-side rendering and forwards the
 * customer's IP address to the Storefront API. Set `buyerIp` on the request context before you
 * create the client.
 */
export interface PrivateClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** The fetch function that the client calls. Defaults to `globalThis.fetch`. createStorefrontClient throws an error when neither exists. */
  fetch?: Fetch;
  /** Your private Storefront API access token. Keep the token out of browser code. createStorefrontClient throws an error when the token is missing. */
  privateStorefrontToken: string;
}

/**
 * Options for a private client without buyer context, for background jobs, webhooks, and other
 * server code with no customer. The client sends a private access token and no customer IP address.
 */
export interface PrivateNoBuyerContextClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** The fetch function that the client calls. Defaults to `globalThis.fetch`. createStorefrontClient throws an error when neither exists. */
  fetch?: Fetch;
  /** Your private Storefront API access token. Keep the token out of browser code. createStorefrontClient throws an error when the token is missing. */
  privateStorefrontToken: string;
}

/**
 * The store settings that you pass as `config` when you create a client. The options depend on the client type.
 *
 * @publicDocs
 */
export type StorefrontClientOptions =
  | PublicClientOptions
  | PrivateClientOptions
  | PrivateNoBuyerContextClientOptions;

/**
 * The arguments for createStorefrontClient. Set `type` to choose the client, then pass a request
 * context and the matching store settings.
 *
 * A public client takes a public token or none. A private client takes a private token and a
 * request context with `buyerIp`. A private client without buyer context takes a private token.
 */
// `Type` and `CacheConfig` are inference holes for `createStorefrontClient`:
// each member's discriminant is intersected with `Type` (resolving to the plain
// literal when `Type` is the full `ClientType` default) and `cache` narrows
// `CacheConfig`, so the call signature can recover both without wrapping this
// union in an intersection — which would defeat discriminant narrowing and
// excess-property checks while the user is still typing.
export type CreateStorefrontClientArgs<
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
  Type extends ClientType = ClientType,
  CacheConfig extends CacheInstance | undefined = CacheInstance | undefined,
> =
  | {
      type: "public" & Type;
      requestContext: RequestContext;
      config: PublicClientOptions<AnyFetch | undefined> & { cache?: CacheConfig };
    }
  | {
      type: "private" & Type;
      requestContext: RequestContext & ShopifyRequestContextWithBuyerIp;
      config: PrivateClientOptions<AnyFetch | undefined> & { cache?: CacheConfig };
    }
  | {
      type: "private_no_buyer_context" & Type;
      requestContext: RequestContext;
      config: PrivateNoBuyerContextClientOptions<AnyFetch | undefined> & { cache?: CacheConfig };
    };
type AutoAddedVariableNames = "country" | "language";
/** The variables that you pass for a document, without `country` and `language`. The client fills both from the request context. */
type UserVariables<Doc> = Omit<VariablesOfDoc<Doc>, AutoAddedVariableNames>;

/** Resolves to `true` when an object type has no required keys. */
type HasNoRequiredKeys<T> = Record<string, never> extends T ? true : false;

/**
 * Options that every Storefront API GraphQL call accepts.
 *
 * @publicDocs
 */
export type StorefrontGraphqlOptions = {
  /**
   * Cancels the request when the signal aborts. The request context's signal and the client timeout
   * also cancel the request. The signal doesn't cancel a stale-while-revalidate refresh.
   */
  signal?: AbortSignal;
};

/** The options for a GraphQL call. The call needs `variables` only when the document declares a required variable. */
type MergedOptions<Doc extends DocLike, Extra extends Record<string, unknown>> = Extra &
  StorefrontGraphqlOptions &
  (HasNoRequiredKeys<UserVariables<Doc>> extends true
    ? { variables?: UserVariables<Doc> }
    : { variables: UserVariables<Doc> });

/**
 * The options argument of a GraphQL call. Pass the options argument when the document declares a
 * required variable. You can leave the options argument out when every variable is optional, or
 * when the only required variables are `$country` and `$language`, which the client fills.
 */
export type GqlRestParam<Doc extends DocLike, Extra extends Record<string, unknown> = {}> =
  HasNoRequiredKeys<MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>> extends true
    ? [options?: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>]
    : [options: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>];

/**
 * The result of a GraphQL call, with the data, any GraphQL errors, and the response headers. Check
 * `errors` before you read `data`.
 *
 * Without errors, `data` holds the full result, typed from your document. With errors, `data` is
 * `null` after a request error or after a failed non-null field at the root. Otherwise, `data`
 * holds a partial result, and `null` replaces each failed field or its nearest nullable parent.
 */
export type StorefrontGraphqlResult<Doc extends DocLike> =
  | { data: ResultOfDoc<Doc>; errors?: undefined; headers: Headers }
  | { data: ResultOfDoc<Doc> | null; errors: GraphQLFormattedError[]; headers: Headers };

/**
 * Runs a Storefront API query or mutation. Pass a `gql` document or a plain query string.
 *
 * @publicDocs
 */
export type StorefrontGraphql =
  /**
   * @param doc - The `gql` document or query string to run.
   * @param options - The variables and abort signal for the call. Pass the options when the document declares a required variable.
   * @returns The response data, any GraphQL errors, and the response headers.
   */
  <const Doc extends DocLike | string>(
    doc: Doc,
    ...options: GqlRestParam<ResolveDoc<Doc>>
  ) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;

/**
 * Chooses the kind of Storefront API client to create. Use `"public"` in the browser, with a public access token or none. Use `"private"` during server-side rendering, with a private token and the customer's IP address. Use `"private_no_buyer_context"` in background jobs and webhooks, with a private token and no customer.
 *
 * @publicDocs
 */
export type ClientType =
  /** Runs in the browser with a public access token or none. */
  | "public"
  /** Runs during server-side rendering with a private token and the customer's IP address. */
  | "private"
  /** Runs in background jobs and webhooks with a private token and no customer. */
  | "private_no_buyer_context";

/**
 * A Storefront API client. Call `graphql()` with a document to run a query or mutation and get a
 * typed result.
 */
export type StorefrontClient<
  Extra extends Record<string, unknown> = {},
  Type extends ClientType = ClientType,
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = {
  /** The client type that you passed to createStorefrontClient. */
  type: Type;
  /** The country and language that the client sends for `$country` and `$language` variables. */
  i18n: RequestContext["i18n"];
  /**
   * Runs a Storefront API query or mutation and returns a typed result. Pass a `gql` document or a
   * plain query string. When the operation declares `$country` or `$language`, the client sets the
   * variable from the request context and overrides any value you pass.
   *
   * The method throws an error when a query passes a `cache` strategy and the client has no cache,
   * or when the strategy uses `private` mode. A catch block for StorefrontApiError doesn't catch
   * this configuration error. To cache customer-specific data, use createRunWithCache with a key
   * unique to the customer.
   */
  graphql: <const Doc extends DocLike | string>(
    doc: Doc,
    ...options: GqlRestParam<ResolveDoc<Doc>, Extra>
  ) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;
  /** The Storefront API GraphQL endpoint that the client calls. */
  apiUrl: string;
  /** Your store's URL with its protocol, such as `"https://my-store.myshopify.com"`. */
  storeUrl: string;
  /** The storefront ID from the client options. */
  storefrontId?: string;
  /** The request context that you passed to createStorefrontClient. */
  requestContext: RequestContext;
};

/**
 * The type of a client that you create with `type: "public"`.
 *
 * @publicDocs
 */
export type PublicStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "public", RequestContext>;

/**
 * The type of a client that you create with `type: "private"`. The client's request context includes `buyerIp`.
 *
 * @publicDocs
 */
export type PrivateStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContextWithBuyerIp = ShopifyRequestContextWithBuyerIp,
> = StorefrontClient<Extra, "private", RequestContext>;

/**
 * The type of a private client with the default request context. Use the type to annotate a private client without naming your request context type.
 *
 * @publicDocs
 */
export type RequestScopedPrivateStorefrontClient<Extra extends Record<string, unknown> = {}> =
  PrivateStorefrontClient<Extra, ShopifyRequestContextWithBuyerIp>;

/**
 * The type of a client that you create with `type: "private_no_buyer_context"`, for background jobs and webhooks.
 *
 * @publicDocs
 */
export type PrivateNoBuyerContextStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "private_no_buyer_context", RequestContext>;

/**
 * Type helpers that read the result and variables types of a Storefront API document.
 *
 * @example
 * ```ts
 * import { gql, type StorefrontApi } from "@shopify/hydrogen";
 *
 * const PRODUCT_QUERY = gql(`query Product($handle: String!) { product(handle: $handle) { title } }`);
 *
 * type Product = StorefrontApi.ResultOf<typeof PRODUCT_QUERY>;
 * type Vars = StorefrontApi.VariablesOf<typeof PRODUCT_QUERY>;
 * ```
 * @publicDocs
 */
export namespace StorefrontApi {
  /** The result type of a document. */
  export type ResultOf<Doc extends DocLike> = StorefrontApiResultOf<Doc>;
  /** The variables type of a document. */
  export type VariablesOf<Doc extends DocLike> = StorefrontApiVariablesOf<Doc>;
  /** A typed Storefront API document from `gql`, or a gql.tada document node. */
  export type DocumentNode = DocLike;
}
