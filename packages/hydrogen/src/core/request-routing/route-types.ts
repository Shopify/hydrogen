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

export type ShopifyRouteHandlerResult<
  TData = unknown,
  TError extends ShopifyRouteError = ShopifyRouteError,
> = ShopifyRouteJsonResult<TData> | ShopifyRouteRedirectResult | ShopifyRouteErrorResult<TError>;

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

export type ShopifyRouteHandlerGroup = Record<string, ShopifyRouteHandler>;

type ShopifyRouteHandlerGroups = readonly ShopifyRouteHandlerGroup[];

type HandlerContext<THandler> = THandler extends (context: infer TContext) => unknown
  ? TContext
  : never;

// Matches the router's `Object.values(group)`, which skips symbol keys.
type RouteHandlerContext<TGroup> = TGroup extends unknown
  ? HandlerContext<TGroup[Extract<keyof TGroup, string | number>]>
  : never;

// An optional `sessionManager` still counts: the router cannot tell which
// handlers tolerate a missing session, so it never passes `undefined`.
type RequiresSessionManager<TContext> = TContext extends unknown
  ? "sessionManager" extends keyof TContext
    ? true
    : false
  : never;

// Each handler declares what it needs through its context parameter, so
// `sessionManager` is only required when some registered handler reads it.
type SessionManagerOption<THandlers extends ShopifyRouteHandlerGroups | undefined> =
  true extends RequiresSessionManager<RouteHandlerContext<NonNullable<THandlers>[number]>>
    ? { sessionManager: ShopifyRouteSessionManager }
    : { sessionManager?: ShopifyRouteSessionManager };

type HydrogenRoutesBaseOptions = Omit<ShopifyRouteHandlerContext, "sessionManager"> & {
  routeTemplates?: ShopifyRouteTemplates;
};

export type HydrogenRoutesOptions<
  THandlers extends ShopifyRouteHandlerGroups | undefined = ShopifyRouteHandlerGroups,
> = HydrogenRoutesBaseOptions & { handlers?: THandlers } & SessionManagerOption<THandlers>;

export type HydrogenRouteHandler<TExtraOptions extends object = object> = <
  // `undefined` is included so an explicit `handlers: undefined` infers as no handlers.
  THandlers extends ShopifyRouteHandlerGroups | undefined = readonly [],
>(
  options: HydrogenRoutesOptions<THandlers> & TExtraOptions,
) => null | Promise<Response>;

/** Options as interceptors see them, where `sessionManager` may be absent. */
export type HydrogenRouteInterceptorOptions = HydrogenRoutesBaseOptions & {
  sessionManager?: ShopifyRouteSessionManager;
  handlers?: ShopifyRouteHandlerGroups;
};

export type HydrogenRouteInterceptor<TExtraOptions extends object = object> = (
  url: URL,
  options: HydrogenRouteInterceptorOptions & TExtraOptions,
) => null | Promise<Response>;
