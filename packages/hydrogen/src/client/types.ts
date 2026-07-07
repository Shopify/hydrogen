import type {
  TadaDocumentNode,
  ResultOf as TadaResultOf,
  VariablesOf as TadaVariablesOf,
} from "gql.tada";

import type { CacheInstance, WaitUntil } from "../core/cache/run-with-cache";
import type { ShopifyRequestContext } from "../core/headers";
import type { AnyStorefrontQueryString, SourceOf, StorefrontQueryString } from "../graphql";
import type { InferResult, InferVariables } from "../graphql";
import type { InferOperationKind } from "../graphql/type-resolver";

export type { I18nConfig } from "../core/headers";

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

// Minimal shape matching the GraphQL spec's error format.
// Defined locally to avoid a runtime dependency on the `graphql` package.
export interface GraphQLFormattedError {
  readonly message: string;
  readonly locations?: ReadonlyArray<{ line: number; column: number }>;
  readonly path?: ReadonlyArray<string | number>;
  readonly extensions?: Record<string, unknown>;
}

type CommonOptions = {
  storeDomain: string;
  apiVersion?: string;
  defaultTimeoutInMs?: number;
  cache?: CacheInstance;
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
  fetch?: Fetch;
  publicStorefrontToken?: string | undefined;
}

/**
 * Private client — uses a private Storefront Access Token.
 *
 * `buyerIp` must be resolved before creating the client.
 *
 * Best for: SSR/server-side requests where you control the fetch
 * layer and can forward trusted buyer context.
 * Token-based access is required for some Storefront API fields, including
 * product tags, metaobjects, metafields, menus, and customers.
 */
export interface PrivateClientOptions<
  Fetch extends AnyFetch | undefined = typeof globalThis.fetch,
> extends CommonOptions {
  fetch?: Fetch;
  privateStorefrontToken: string;
  buyerIp: string;
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
  fetch?: Fetch;
  privateStorefrontToken: string;
}

export type StorefrontClientOptions =
  | PublicClientOptions
  | PrivateClientOptions
  | PrivateNoBuyerContextClientOptions;

export type CreateStorefrontClientArgs<
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> =
  | {
      type: "public";
      requestContext: RequestContext;
      config: PublicClientOptions<AnyFetch | undefined>;
    }
  | {
      type: "private";
      requestContext: RequestContext;
      config: PrivateClientOptions<AnyFetch | undefined>;
    }
  | {
      type: "private_no_buyer_context";
      requestContext: RequestContext;
      config: PrivateNoBuyerContextClientOptions<AnyFetch | undefined>;
    };
type AutoAddedVariableNames = "country" | "language";
type UserVariables<Doc> = Omit<VariablesOfDoc<Doc>, AutoAddedVariableNames>;

type HasNoRequiredKeys<T> = Record<string, never> extends T ? true : false;

export type StorefrontGraphqlOptions = {
  signal?: AbortSignal;
};

type MergedOptions<Doc extends DocLike, Extra extends Record<string, unknown>> = Extra &
  StorefrontGraphqlOptions &
  (HasNoRequiredKeys<UserVariables<Doc>> extends true
    ? { variables?: UserVariables<Doc> }
    : { variables: UserVariables<Doc> });

export type GqlRestParam<Doc extends DocLike, Extra extends Record<string, unknown> = {}> =
  HasNoRequiredKeys<MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>> extends true
    ? [options?: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>]
    : [options: MergedOptions<Doc, GraphqlExtraOptionsForDoc<Doc, Extra>>];

// Discriminated on the presence of `errors`, which the SFAPI populates iff the
// request was not a clean success. The two branches encode a guarantee the GraphQL
// spec gives us (verified against the live SFAPI):
//   - No `errors` ⟹ `data` is non-null and fully conforms to the schema's per-field
//     nullability (gql.tada already encodes that). Callers skip the null check.
//   - `errors` present ⟹ `data` may be `null` (request error, or a non-null field
//     error that propagated to the root) or partial (a nullable ancestor absorbed a
//     nested null). Treat `data` as untrusted and inspect `errors` first.
// `Partial` is deliberately NOT used: a non-null `data` never has absent top-level
// keys — failures surface as `null` values, which the schema types already cover.
export type StorefrontGraphqlResult<Doc extends DocLike> =
  | { data: ResultOfDoc<Doc>; errors?: undefined; headers: Headers }
  | { data: ResultOfDoc<Doc> | null; errors: GraphQLFormattedError[]; headers: Headers };

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

export type StorefrontClient<
  Extra extends Record<string, unknown> = {},
  Type extends ClientType = ClientType,
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = {
  type: Type;
  i18n: RequestContext["i18n"];
  graphql: <const Doc extends DocLike | string>(
    doc: Doc,
    ...options: GqlRestParam<ResolveDoc<Doc>, Extra>
  ) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;
  apiUrl: string;
  storeUrl: string;
  requestContext: RequestContext;
};

export type PublicStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "public", RequestContext>;

export type PrivateStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "private", RequestContext>;

export type RequestScopedPrivateStorefrontClient<Extra extends Record<string, unknown> = {}> =
  PrivateStorefrontClient<Extra, ShopifyRequestContext>;

export type PrivateNoBuyerContextStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends ShopifyRequestContext = ShopifyRequestContext,
> = StorefrontClient<Extra, "private_no_buyer_context", RequestContext>;

export namespace StorefrontApi {
  export type ResultOf<Doc extends DocLike> = StorefrontApiResultOf<Doc>;
  export type VariablesOf<Doc extends DocLike> = StorefrontApiVariablesOf<Doc>;
  export type DocumentNode = DocLike;
}
