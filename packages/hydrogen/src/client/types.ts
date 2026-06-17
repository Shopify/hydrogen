import type {
  TadaDocumentNode,
  ResultOf as TadaResultOf,
  VariablesOf as TadaVariablesOf,
} from "gql.tada";

import type { StorefrontRequestContext } from "../core/headers";
import type { AnyStorefrontQueryString, StorefrontQueryString } from "../graphql";
import type { InferResult, InferVariables } from "../graphql";
import type { CountryCode, LanguageCode } from "../graphql/generated/storefront-api-types";

type DocLike = TadaDocumentNode<any, any> | AnyStorefrontQueryString;
type InferredDoc<T extends string> = StorefrontQueryString<InferResult<T>, InferVariables<T>>;
type ResolveDoc<D> = D extends DocLike ? D : D extends string ? InferredDoc<D> : never;
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

export type I18nConfig = {
  language: LanguageCode;
  country: CountryCode;
};

type CommonOptions = {
  storeDomain: string;
  apiVersion?: string;
  i18n: I18nConfig;
  requestContext?: StorefrontRequestContext;
  fetch?: typeof globalThis.fetch;
  defaultTimeoutInMs?: number;
};

/**
 * Public client — uses a public Storefront Access Token.
 *
 * Throttle isolation: per client IP (the shopper's browser).
 *
 * Best for: client-side (browser) requests where each shopper
 * naturally gets their own throttle bucket.
 */
export interface PublicClientOptions extends CommonOptions {
  publicStorefrontToken?: string | undefined;
}

/**
 * Private client — uses a private Storefront Access Token.
 * Requires `buyerIp` to identify the buyer per request, which
 * gives each shopper their own throttle bucket.
 *
 * Throttle isolation: per buyer IP (forwarded via headers), per app.
 * Scales best under load because each buyer is isolated.
 *
 * `buyerIp` must be resolved before creating the client.
 *
 * Best for: SSR/server-side requests where you control the fetch
 * layer and can forward buyer identity.
 */
export interface PrivateClientOptions extends CommonOptions {
  privateStorefrontToken: string;
  buyerIp: string;
}

/**
 * Private client with shared throttle — uses a private Storefront
 * Access Token but does NOT forward per-buyer identity.
 *
 * Throttle isolation: single shared bucket for the entire app.
 * All requests are pooled, so this has the lowest throughput ceiling.
 *
 * No per-buyer identity is forwarded.
 *
 * Best for: background jobs, webhooks, or server contexts where no
 * shopper identity is available.
 */
export interface SharedRateLimitClientOptions extends CommonOptions {
  privateStorefrontToken: string;
}

export type StorefrontClientOptions =
  | PublicClientOptions
  | PrivateClientOptions
  | SharedRateLimitClientOptions;

export type CreateStorefrontClientArgs =
  | { type: "public"; config: PublicClientOptions }
  | { type: "private"; config: PrivateClientOptions }
  | { type: "private_shared_rate_limit"; config: SharedRateLimitClientOptions };

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
  HasNoRequiredKeys<MergedOptions<Doc, Extra>> extends true
    ? [options?: MergedOptions<Doc, Extra>]
    : [options: MergedOptions<Doc, Extra>];

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

// Widest signature — accepts optional request. Used by GenericStorefrontClient.
export type StorefrontGraphql = <const Doc extends DocLike | string>(
  doc: Doc,
  ...options: GqlRestParam<ResolveDoc<Doc>>
) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;

export type ClientType =
  /** Public access token. Throttled per client IP. Best for: browser requests. */
  | "public"
  /** Private token + per-buyer isolation. Best for: SSR. */
  | "private"
  /** Private token, shared app-wide throttle. No buyer identity. Best for: background jobs, webhooks. */
  | "private_shared_rate_limit";

type RequestContextProperty<RequestContext extends StorefrontRequestContext | undefined> = [
  RequestContext,
] extends [StorefrontRequestContext]
  ? { requestContext: RequestContext }
  : { requestContext?: StorefrontRequestContext };

export type StorefrontClient<
  Extra extends Record<string, unknown> = {},
  Type extends ClientType = ClientType,
  RequestContext extends StorefrontRequestContext | undefined = undefined,
> = {
  type: Type;
  graphql: <const Doc extends DocLike | string>(
    doc: Doc,
    ...options: GqlRestParam<ResolveDoc<Doc>, Extra>
  ) => Promise<StorefrontGraphqlResult<ResolveDoc<Doc>>>;
  apiUrl: string;
  storeUrl: string;
} & RequestContextProperty<RequestContext>;

export type PublicStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends StorefrontRequestContext | undefined = undefined,
> = StorefrontClient<Extra, "public", RequestContext>;

export type PrivateStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends StorefrontRequestContext | undefined = undefined,
> = StorefrontClient<Extra, "private", RequestContext>;

export type RequestScopedPrivateStorefrontClient<Extra extends Record<string, unknown> = {}> =
  PrivateStorefrontClient<Extra, StorefrontRequestContext>;

export type SharedRateLimitStorefrontClient<
  Extra extends Record<string, unknown> = {},
  RequestContext extends StorefrontRequestContext | undefined = undefined,
> = StorefrontClient<Extra, "private_shared_rate_limit", RequestContext>;

export type GenericStorefrontClient = {
  graphql: StorefrontGraphql;
  apiUrl: string;
  storeUrl: string;
  requestContext?: StorefrontRequestContext;
};

export namespace StorefrontApi {
  export type ResultOf<Doc extends DocLike> = StorefrontApiResultOf<Doc>;
  export type VariablesOf<Doc extends DocLike> = StorefrontApiVariablesOf<Doc>;
  export type DocumentNode = DocLike;
}
