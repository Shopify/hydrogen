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

type DocLike = TadaDocumentNode<any, any> | AnyStorefrontQueryString;
type InferredDoc<T extends string> = StorefrontQueryString<InferResult<T>, InferVariables<T>, T>;
type ResolveDoc<D> = D extends DocLike ? D : D extends string ? InferredDoc<D> : never;
type SourceText<Doc> = [SourceOf<Doc>] extends [never]
  ? Doc extends string
    ? Doc
    : never
  : SourceOf<Doc>;
type OperationKindOfDoc<Doc> = [SourceText<Doc>] extends [never]
  ? "unknown"
  : string extends SourceText<Doc>
    ? "unknown"
    : InferOperationKind<SourceText<Doc>>;
type GraphqlExtraOptionsForDoc<Doc, Extra extends Record<string, unknown>> =
  OperationKindOfDoc<Doc> extends "query" ? Extra : Omit<Extra, "cache">;
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
 * Minimal shape matching the GraphQL spec's error format, defined locally to
 * avoid a runtime dependency on the `graphql` package.
 *
 * Present on the `errors` arm of {@link StorefrontGraphqlResult}.
 */
export interface GraphQLFormattedError {
  /** Human-readable error description. */
  readonly message: string;
  /** Source locations in the query where the error originated. */
  readonly locations?: ReadonlyArray<{ line: number; column: number }>;
  /** Response path to the field that triggered the error. */
  readonly path?: ReadonlyArray<string | number>;
  /** Vendor extensions (e.g. Shopify error codes). */
  readonly extensions?: Record<string, unknown>;
}

type CommonOptions = {
  /** Shopify store domain — e.g. `"my-store.myshopify.com"`. Normalized internally. */
  storeDomain: string;
  /**
   * Identifies the Hydrogen storefront making Storefront API requests so Shopify can attribute
   * cart analytics to the correct storefront.
   */
  storefrontId?: string;
  /**
   * Storefront API version used in the GraphQL endpoint path (`/api/<version>/graphql.json`).
   * Defaults to the version baked into the package. To send some queries to a different endpoint
   * version (e.g. `unstable`), create a second `createStorefrontClient` instance with that
   * `apiVersion` so version routing stays explicit. Hydrogen's bundled gql.tada schema still
   * controls type inference, so queries against fields outside that schema need their own typing.
   */
  apiVersion?: string;
  /** Per-request timeout in milliseconds. `0` disables the timeout. Defaults to 30,000 ms. */
  defaultTimeoutInMs?: number;
  /** Shared cache instance that enables per-query caching via the `cache` option on `graphql()`. */
  // Mirrored by the `cache?: CacheConfig` inference hole in
  // CreateStorefrontClientArgs — keep the key and type in sync.
  cache?: CacheInstance;
  /** Worker-style `waitUntil` to extend the request lifetime for background cache writes. */
  waitUntil?: WaitUntil;
};

type AnyFetch = typeof globalThis.fetch | ((...args: never[]) => Promise<Response>);

/**
 * Public client — uses a public Storefront Access Token, or tokenless access
 * when `publicStorefrontToken` is omitted.
 *
 * Best for: browser or mobile requests where the token is safe to expose.
 * Token-based access is required for some Storefront API fields, including
 * product tags, metaobjects, metafields, menus, and customers.
 */
export interface PublicClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** Custom fetch implementation. Falls back to `globalThis.fetch`. */
  fetch?: Fetch;
  /** Public Storefront Access Token. Omit for tokenless access (limited fields). */
  publicStorefrontToken?: string | undefined;
}

/**
 * Private client — uses a private Storefront Access Token.
 *
 * `buyerIp` must be resolved on the request context before creating the client.
 *
 * Best for: SSR/server-side requests where you control the fetch
 * layer and can forward trusted buyer context.
 * Token-based access is required for some Storefront API fields, including
 * product tags, metaobjects, metafields, menus, and customers.
 */
export interface PrivateClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** Custom fetch implementation. Falls back to `globalThis.fetch`. */
  fetch?: Fetch;
  /** Private Storefront Access Token. Must never be exposed to browsers. */
  privateStorefrontToken: string;
}

/**
 * Private client without buyer context — uses a private Storefront Access Token
 * but does NOT forward per-buyer identity.
 *
 * Best for: background jobs, webhooks, or server contexts where no
 * shopper identity is available.
 */
export interface PrivateNoBuyerContextClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  /** Custom fetch implementation. Falls back to `globalThis.fetch`. */
  fetch?: Fetch;
  /** Private Storefront Access Token. Must never be exposed to browsers. */
  privateStorefrontToken: string;
}

/** Union of all config shapes passed as the `config` field of {@link CreateStorefrontClientArgs}. */
export type StorefrontClientOptions =
  | PublicClientOptions
  | PrivateClientOptions
  | PrivateNoBuyerContextClientOptions;

/**
 * Discriminated union accepted by `createStorefrontClient`.
 *
 * Discriminated on `type`: `"public"` requires a public (or no) token,
 * `"private"` requires a private token plus a request context with `buyerIp`,
 * and `"private_no_buyer_context"` requires a private token; `buyerIp` is not forwarded.
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
type UserVariables<Doc> = Omit<VariablesOfDoc<Doc>, AutoAddedVariableNames>;

type HasNoRequiredKeys<T> = Record<string, never> extends T ? true : false;

/** Per-call options common to every `storefront.graphql()` invocation. */
export type StorefrontGraphqlOptions = {
  /** Abort signal forwarded to the underlying fetch. Combined with the request-context signal via `AbortSignal.any`. */
  signal?: AbortSignal;
};

type MergedOptions<Doc extends DocLike, Extra extends Record<string, unknown>> = Extra &
  StorefrontGraphqlOptions &
  (HasNoRequiredKeys<UserVariables<Doc>> extends true
    ? { variables?: UserVariables<Doc> }
    : { variables: UserVariables<Doc> });

/**
 * Rest-parameter tuple for `storefront.graphql()`.
 *
 * Resolves to `[options]` (required) when the document declares required
 * variables, or `[options?]` (optional) when all variables are optional or
 * auto-injected (e.g. `$country`, `$language`).
 */
export type GqlRestParam<Doc extends DocLike, Extra extends Record<string, unknown> = {}> =
  HasNoRequiredKeys<MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>> extends true
    ? [options?: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>]
    : [options: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>];

/**
 * Discriminated union returned by `storefront.graphql()`.
 *
 * Discriminated on `errors`:
 *
 * - **No `errors`** — `data` is non-null and fully typed by the document.
 * - **`errors` present** — `data` may be `null` (request-level error) or
 *   partial (field-level error absorbed by a nullable ancestor). Always
 *   inspect `errors` first.
 *
 * `Partial` is deliberately not used: a non-null `data` never has absent
 * top-level keys — failures surface as `null` values already covered by the
 * schema types.
 */
export type StorefrontGraphqlResult<Doc extends DocLike> =
  | { data: ResultOfDoc<Doc>; errors?: undefined; headers: Headers }
  | { data: ResultOfDoc<Doc> | null; errors: GraphQLFormattedError[]; headers: Headers };

/** Base callable signature of `StorefrontClient.graphql` without per-client extra options. Accepts a `gql()` document or a plain string. */
export type StorefrontGraphql = <const Doc extends DocLike | string>(
  doc: Doc,
  ...options: GqlRestParam<ResolveDoc<Doc>>
) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;

export type ClientType =
  /** Public access token or tokenless access. Best for: browser requests. */
  | "public"
  /** Private token with trusted buyer context. Best for: SSR. */
  | "private"
  /** Private token without buyer context. Best for: background jobs, webhooks. */
  | "private_no_buyer_context";

/**
 * A type-safe Storefront API client returned by `createStorefrontClient`.
 *
 * Call `client.graphql(doc, options?)` to execute a query or mutation against
 * the Storefront API. The result is typed by the document you pass in.
 */
export type StorefrontClient<
  Extra extends Record<string, unknown> = {},
  Type extends ClientType = ClientType,
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = {
  /** Which client variant was created (`"public"`, `"private"`, or `"private_no_buyer_context"`). */
  type: Type;
  /** Resolved i18n config (country + language) used for automatic variable injection. */
  i18n: RequestContext["i18n"];
  /**
   * Execute a Storefront API GraphQL operation.
   *
   * Accepts a `gql()` document or a plain query string. Variables
   * declared as `$country` / `$language` are auto-injected from the client's
   * i18n config.
   */
  graphql: <const Doc extends DocLike | string>(
    doc: Doc,
    ...options: GqlRestParam<ResolveDoc<Doc>, Extra>
  ) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;
  /** Full Storefront API GraphQL endpoint URL. */
  apiUrl: string;
  /** Normalized store URL (e.g. `"https://my-store.myshopify.com"`). */
  storeUrl: string;
  /** Storefront identifier for cart analytics attribution, when provided. */
  storefrontId?: string;
  /** The request context used for request-scoped headers, abort signals, and i18n. */
  requestContext: RequestContext;
};

/** A {@link StorefrontClient} narrowed to `type: "public"`. */
export type PublicStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "public", RequestContext>;

/** A {@link StorefrontClient} narrowed to `type: "private"`. Requires a request context with `buyerIp`. */
export type PrivateStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContextWithBuyerIp = ShopifyRequestContextWithBuyerIp,
> = StorefrontClient<Extra, "private", RequestContext>;

/** Convenience alias: a private client whose request context is always the concrete `ShopifyRequestContextWithBuyerIp`. */
export type RequestScopedPrivateStorefrontClient<Extra extends Record<string, unknown> = {}> =
  PrivateStorefrontClient<Extra, ShopifyRequestContextWithBuyerIp>;

/** A {@link StorefrontClient} narrowed to `type: "private_no_buyer_context"`. Best for background jobs and webhooks. */
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
 */
export namespace StorefrontApi {
  /** Extracts the typed result shape from a Storefront API document. */
  export type ResultOf<Doc extends DocLike> = StorefrontApiResultOf<Doc>;
  /** Extracts the typed variables shape from a Storefront API document. */
  export type VariablesOf<Doc extends DocLike> = StorefrontApiVariablesOf<Doc>;
  /** A typed Storefront API document — a `gql()` document or a `TadaDocumentNode`. */
  export type DocumentNode = DocLike;
}
