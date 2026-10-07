import type { StorefrontClient } from "../../client";
import type { ShopifyRequestContext } from "../request-context";
import type { ShopifyRouteTemplates } from "../standard-routes/types";

type Awaitable<T> = T | Promise<T>;

export type ShopifyRouteSessionManager = {
  getSessionOrigin(): Awaitable<string>;
  getSessionItem(key: string): Awaitable<unknown>;
  setSessionItem(key: string, value: unknown): Awaitable<void>;
  removeSessionItem(key: string): Awaitable<void>;
  commit?(): Awaitable<HeadersInit | void>;
};

export type ShopifyRouteHandlerContext = {
  request: Request;
  sessionManager: ShopifyRouteSessionManager;
  storefrontClient: StorefrontClient;
  requestContext: ShopifyRequestContext;
};

export type ShopifyRouteJsonResult<TData = unknown> = {
  type: "json";
  data: TData;
  headers?: HeadersInit;
};

export type ShopifyRedirectStatus = 301 | 302 | 303 | 307 | 308;

export type ShopifyRouteRedirectResult = {
  type: "redirect";
  location: string;
  /** HTTP redirect status. Defaults to 303 (See Other). */
  status?: ShopifyRedirectStatus;
  headers?: HeadersInit;
};

/** @publicDocs */
export type ShopifyRouteError = {
  code: string;
  message: string;
};

export type ShopifyRouteErrorResult<TError extends ShopifyRouteError = ShopifyRouteError> = {
  type: "error";
  error: TError;
  status?: number;
  headers?: HeadersInit;
};

/**
 * A fully formed `Response` for handlers that pass through or serve something
 * other than JSON. Returned as-is, with request-context response headers
 * applied on top.
 */
export type ShopifyRouteResponseResult = {
  type: "response";
  response: Response;
};

export type ShopifyRouteHandlerResult<
  TData = unknown,
  TError extends ShopifyRouteError = ShopifyRouteError,
> =
  | ShopifyRouteJsonResult<TData>
  | ShopifyRouteRedirectResult
  | ShopifyRouteErrorResult<TError>
  | ShopifyRouteResponseResult;

/**
 * A route handler is a callable plus the route it owns. `pathname` matches
 * exactly, or as a prefix when it ends with `/*` (`/a/*` owns `/a` and
 * `/a/anything`); literal pathnames win over wildcards. `method` matches one
 * HTTP method, or every method when it is `"*"`.
 */
export type CallableRouteHandler<
  TContext,
  TResult,
  TPathname extends string = string,
  TMethod extends string = string,
> = ((context: TContext) => Promise<TResult>) & {
  readonly pathname: TPathname;
  readonly method: TMethod;
};

export type ShopifyRouteHandler<
  TPathname extends string = string,
  TMethod extends string = string,
> = CallableRouteHandler<ShopifyRouteHandlerContext, ShopifyRouteHandlerResult, TPathname, TMethod>;

/** @publicDocs */
export type ShopifyRouteHandlerGroup = Record<string, ShopifyRouteHandler>;

export type HydrogenRoutesOptions = ShopifyRouteHandlerContext & {
  routeTemplates?: ShopifyRouteTemplates;
  handlers?: readonly ShopifyRouteHandlerGroup[];
};

export type HydrogenRouteHandler<TExtraOptions extends object = object> = (
  options: HydrogenRoutesOptions & TExtraOptions,
) => null | Promise<Response>;

export type HydrogenRouteInterceptor<TExtraOptions extends object = object> = (
  url: URL,
  ...args: Parameters<HydrogenRouteHandler<TExtraOptions>>
) => ReturnType<HydrogenRouteHandler<TExtraOptions>>;
