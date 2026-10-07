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

/** A gql.tada document node or a Storefront API document from `gql`. */
type DocLike = TadaDocumentNode<any, any> | AnyStorefrontQueryString;
/** A typed Storefront API document inferred from a raw query string literal. */
type InferredDoc<T extends string> = StorefrontQueryString<InferResult<T>, InferVariables<T>, T>;
/** Resolves a document argument to a typed document, inferring types when the argument is a plain string. */
type ResolveDoc<D> = D extends DocLike ? D : D extends string ? InferredDoc<D> : never;
/** Extracts a document's literal source text, or the string itself for an unbranded string. */
type SourceText<Doc> = [SourceOf<Doc>] extends [never]
  ? Doc extends string
    ? Doc
    : never
  : SourceOf<Doc>;
/** Resolves a document to its operation kind, or `"unknown"` when the source text isn't a literal. */
type OperationKindOfDoc<Doc> = [SourceText<Doc>] extends [never]
  ? "unknown"
  : string extends SourceText<Doc>
    ? "unknown"
    : InferOperationKind<SourceText<Doc>>;
/** Removes the `cache` option for any document that the type system can't identify as a query. */
type GraphqlExtraOptionsForDoc<Doc, Extra extends Record<string, unknown>> =
  OperationKindOfDoc<Doc> extends "query" ? Extra : Omit<Extra, "cache">;
/** Extracts the result type from a Storefront API document or a gql.tada document node. */
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
 * An error in the GraphQL spec's error format. A Storefront API result lists these
 * errors in its errors field.
 */
export interface GraphQLFormattedError {
  /** Human-readable error description. */
  readonly message: string;
  /** Source locations in the query where the error originated. */
  readonly locations?: ReadonlyArray<{ line: number; column: number }>;
  /** Response path to the field that triggered the error. */
  readonly path?: ReadonlyArray<string | number>;
  /** Vendor-specific details that the API attaches to the error. */
  readonly extensions?: Record<string, unknown>;
}

type CommonOptions = {
  /**
   * Shopify store domain, such as `"my-store.myshopify.com"`. The client adds
   * an HTTPS protocol when the domain has none and removes trailing slashes.
   * Creating the client throws an error when the domain is empty.
   */
  storeDomain: string;
  /**
   * Identifies the Hydrogen storefront that makes Storefront API requests. Shopify uses
   * the ID to attribute cart analytics to the storefront.
   */
  storefrontId?: string;
  /**
   * Storefront API version in the GraphQL endpoint path, `/api/<version>/graphql.json`.
   * Defaults to the version that the package bundles. To send some queries to another
   * version, such as `unstable`, create a second client with that version. Type inference
   * still uses Hydrogen's bundled schema. Write your own types for fields outside that schema.
   */
  apiVersion?: string;
  /**
   * Per-request timeout in milliseconds. Defaults to 30,000. Set `0` to disable the timeout.
   * Stale-while-revalidate refreshes use the same timeout, or 30,000 when the timeout is `0`.
   * Creating the client throws an error for a negative value.
   */
  defaultTimeoutInMs?: number;
  /**
   * Cache store for query results.
   *
   * The client caches only queries that set a `cache` strategy on the call. Mutations always skip the cache. The client never caches a response with GraphQL errors.
   */
  // Mirrored by the `cache?: CacheConfig` inference hole in
  // CreateStorefrontClientArgs — keep the key and type in sync.
  cache?: CacheInstance;
  /** Extends the request lifetime for background cache writes, such as the worker `waitUntil` function. */
  waitUntil?: WaitUntil;
};

/** Any fetch-compatible function that resolves to a Response. */
type AnyFetch = typeof globalThis.fetch | ((...args: never[]) => Promise<Response>);

/**
 * Options for a public client. The client sends a public Storefront API access token,
 * or makes tokenless requests when you omit the token.
 *
 * Use a public client for browser or mobile requests where the token is safe to expose.
 * Some Storefront API fields require token-based access, including product tags,
 * metaobjects, metafields, menus, and customers.
 */
export interface PublicClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. Creating the client throws an error when neither exists. */
  fetch?: Fetch;
  /** Public Storefront API access token. Omit the token for tokenless access to fewer fields. Creating the client throws an error for an empty string. */
  publicStorefrontToken?: string | undefined;
}

/**
 * Options for a private client, which sends a private Storefront API access token.
 *
 * Use a private client for server-side rendering where you control the fetch layer
 * and can forward trusted customer context. Resolve `buyerIp` on the request context
 * before you create the client.
 */
export interface PrivateClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. Creating the client throws an error when neither exists. */
  fetch?: Fetch;
  /** Private Storefront API access token. Never expose the token to browsers. Creating the client throws an error when the token is missing. */
  privateStorefrontToken: string;
}

/**
 * Options for a private client without buyer context. The client sends a private
 * Storefront API access token and doesn't forward the customer IP.
 *
 * Use this client type for background jobs, webhooks, or server code with no customer identity.
 */
export interface PrivateNoBuyerContextClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. Creating the client throws an error when neither exists. */
  fetch?: Fetch;
  /** Private Storefront API access token. Never expose the token to browsers. Creating the client throws an error when the token is missing. */
  privateStorefrontToken: string;
}

/**
 * The store configuration that you pass as `config` when you create a client. Each client type takes a different options shape.
 *
 * @publicDocs
 */
export type StorefrontClientOptions =
  | PublicClientOptions
  | PrivateClientOptions
  | PrivateNoBuyerContextClientOptions;

/**
 * Arguments for creating a Storefront API client. Set `type` to choose the client.
 *
 * A public client takes a public token or none. A private client takes a private token
 * and a request context with `buyerIp`. A private client without buyer context takes a
 * private token and doesn't forward the customer IP.
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
/** Variables a caller passes for a document. The type omits `country` and `language`, which the client fills. */
type UserVariables<Doc> = Omit<VariablesOfDoc<Doc>, AutoAddedVariableNames>;

/** Resolves to `true` when an object type has no required keys. */
type HasNoRequiredKeys<T> = Record<string, never> extends T ? true : false;

/**
 * Per-call options that every Storefront API GraphQL call accepts.
 *
 * @publicDocs
 */
export type StorefrontGraphqlOptions = {
  /**
   * Abort signal for the request. The client combines it with the request context's signal and the timeout.
   * The signal doesn't cancel a stale-while-revalidate refresh. `defaultTimeoutInMs` bounds the refresh.
   */
  signal?: AbortSignal;
};

/** Full options object for a GraphQL call. The type requires variables only when the document declares required variables. */
type MergedOptions<Doc extends DocLike, Extra extends Record<string, unknown>> = Extra &
  StorefrontGraphqlOptions &
  (HasNoRequiredKeys<UserVariables<Doc>> extends true
    ? { variables?: UserVariables<Doc> }
    : { variables: UserVariables<Doc> });

/**
 * Rest-parameter tuple for a Storefront API GraphQL call.
 *
 * The call needs the options argument when the document declares required variables.
 * The argument is optional when every variable is optional or is one that the client fills,
 * `$country` or `$language`.
 */
export type GqlRestParam<Doc extends DocLike, Extra extends Record<string, unknown> = {}> =
  HasNoRequiredKeys<MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>> extends true
    ? [options?: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>]
    : [options: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>];

/**
 * Result of a Storefront API GraphQL call. Check `errors` before you read the data.
 *
 * Without errors, the data is non-null and matches the document's types. With errors, the data is `null` after a request-level error or after a non-null field error that reaches the root. Otherwise the data is partial, and a nullable ancestor of each failed field holds `null`.
 *
 * Non-null data always has every top-level key. Failed fields hold `null`, which the schema types already allow.
 */
export type StorefrontGraphqlResult<Doc extends DocLike> =
  | { data: ResultOfDoc<Doc>; errors?: undefined; headers: Headers }
  | { data: ResultOfDoc<Doc> | null; errors: GraphQLFormattedError[]; headers: Headers };

/**
 * Base call signature of the client's GraphQL method, without per-client extra options. Accepts a `gql` document or a plain string.
 *
 * @publicDocs
 */
export type StorefrontGraphql =
  /**
   * @param doc - The `gql` document or query string to run.
   * @param options - The variables and abort signal for the call. The call needs this argument when the document declares required variables.
   * @returns The response data, any GraphQL errors, and the response headers.
   */
  <const Doc extends DocLike | string>(
    doc: Doc,
    ...options: GqlRestParam<ResolveDoc<Doc>>
  ) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;

/**
 * The client type that you set as `type` when you create a client. A `"public"` client uses a public access token or none, for browser requests. A `"private"` client uses a private token and trusted customer context, for server-side rendering. A `"private_no_buyer_context"` client uses a private token without customer context, for background jobs and webhooks.
 *
 * @publicDocs
 */
export type ClientType =
  /** Public access token or tokenless access, for browser requests. */
  | "public"
  /** Private token with trusted customer context, for server-side rendering. */
  | "private"
  /** Private token without customer context, for background jobs and webhooks. */
  | "private_no_buyer_context";

/**
 * A type-safe Storefront API client.
 *
 * Pass a document and options to the client's GraphQL method to run a query or
 * mutation. The document you pass types the result.
 */
export type StorefrontClient<
  Extra extends Record<string, unknown> = {},
  Type extends ClientType = ClientType,
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = {
  /** The client type that you passed when you created the client. */
  type: Type;
  /** The country and language from the request context. The client fills `$country` and `$language` variables with these values. */
  i18n: RequestContext["i18n"];
  /**
   * Runs a Storefront API GraphQL operation.
   *
   * Accepts a `gql` document or a plain query string. When the operation declares
   * `$country` or `$language`, the client fills the variable from its resolved locale
   * and replaces any value you pass.
   *
   * The method throws a configuration error when a query sets a `cache` strategy and the client has no cache, or when the strategy uses private mode. The configuration error doesn't extend StorefrontApiError. To cache customer-specific work, use createRunWithCache with a key unique to that customer.
   */
  graphql: <const Doc extends DocLike | string>(
    doc: Doc,
    ...options: GqlRestParam<ResolveDoc<Doc>, Extra>
  ) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;
  /** Full Storefront API GraphQL endpoint URL. */
  apiUrl: string;
  /** Normalized store URL, such as `"https://my-store.myshopify.com"`. */
  storeUrl: string;
  /** The storefront ID from the client options, for cart analytics attribution. */
  storefrontId?: string;
  /** The request context that supplies request-scoped headers, the abort signal, and i18n. */
  requestContext: RequestContext;
};

/**
 * A Storefront API client narrowed to the public client type.
 *
 * @publicDocs
 */
export type PublicStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "public", RequestContext>;

/**
 * A Storefront API client narrowed to the private client type. The request context includes `buyerIp`.
 *
 * @publicDocs
 */
export type PrivateStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContextWithBuyerIp = ShopifyRequestContextWithBuyerIp,
> = StorefrontClient<Extra, "private", RequestContext>;

/**
 * A private Storefront API client typed with the base request context plus a buyer IP. Use the type to annotate a private client without naming a request context type.
 *
 * @publicDocs
 */
export type RequestScopedPrivateStorefrontClient<Extra extends Record<string, unknown> = {}> =
  PrivateStorefrontClient<Extra, ShopifyRequestContextWithBuyerIp>;

/**
 * A Storefront API client narrowed to the private type without buyer context. Use the type for clients in background jobs and webhooks.
 *
 * @publicDocs
 */
export type PrivateNoBuyerContextStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "private_no_buyer_context", RequestContext>;

/**
 * Namespace for extracting result and variable types from Storefront API documents.
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
  /** Extracts the typed result shape from a Storefront API document. */
  export type ResultOf<Doc extends DocLike> = StorefrontApiResultOf<Doc>;
  /** Extracts the typed variables shape from a Storefront API document. */
  export type VariablesOf<Doc extends DocLike> = StorefrontApiVariablesOf<Doc>;
  /** A typed Storefront API document from `gql`, or a gql.tada document node. */
  export type DocumentNode = DocLike;
}
