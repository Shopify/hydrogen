import type { StorefrontClient } from "../../client";
import type { ShopifyRequestContext } from "../request-context";
import type { ShopifyRouteTemplates } from "../standard-routes/types";

/** A value or a promise for that value. */
type Awaitable<T> = T | Promise<T>;

/** The session storage that route handlers and the customer session read and write. Implement the methods with your app's session. */
export type ShopifyRouteSessionManager = {
  /** Returns your storefront's HTTPS origin. Customer account sign-in builds its OAuth redirect URL from the origin. */
  getSessionOrigin(): Awaitable<string>;
  /** Returns the session value stored under a key. */
  getSessionItem(key: string): Awaitable<unknown>;
  /** Stores a value in the session under a key. */
  setSessionItem(key: string, value: unknown): Awaitable<void>;
  /** Deletes the session value stored under a key. */
  removeSessionItem(key: string): Awaitable<void>;
  /** Saves session changes and returns the headers, such as a cookie, to add to the response. */
  commit?(): Awaitable<HeadersInit | void>;
};

/** The values that Hydrogen passes to each registered route handler. */
export type ShopifyRouteHandlerContext = {
  /** The incoming request that matched the handler's pathname and method. */
  request: Request;
  /** Your app's session storage for the current request. `handleShopifyRoutes` requires it only when a registered handler's context includes this field. */
  sessionManager: ShopifyRouteSessionManager;
  /** The Storefront API client for the current request. */
  storefrontClient: StorefrontClient;
  /** The current request's context, the same one the Storefront API client uses. */
  requestContext: ShopifyRequestContext;
};

/** A route handler result that Hydrogen sends as a `200` JSON response. */
export type ShopifyRouteJsonResult<TData = unknown> = {
  /** Set to `json` for a JSON response. */
  type: "json";
  /** The value that Hydrogen serializes as the response body. */
  data: TData;
  /** Extra headers for the response. Hydrogen sets `content-type` to `application/json` and overrides any value you pass. */
  headers?: HeadersInit;
};

/** The HTTP status codes a route handler can use for a redirect. */
export type ShopifyRedirectStatus = 301 | 302 | 303 | 307 | 308;

/** A route handler result that Hydrogen sends as a redirect response. */
export type ShopifyRouteRedirectResult = {
  /** Set to `redirect` for a redirect response. */
  type: "redirect";
  /** The redirect target. Hydrogen resolves a relative path against the request's origin. */
  location: string;
  /** The HTTP redirect status. Defaults to `303`. */
  status?: ShopifyRedirectStatus;
  /** Extra headers for the redirect response. */
  headers?: HeadersInit;
};

/**
 * The code and message that an error result sends in the response body's `error` field.
 *
 * @publicDocs
 */
export type ShopifyRouteError = {
  /** A machine-readable error code. */
  code: string;
  /** A human-readable error message. */
  message: string;
};

/** A route handler result that Hydrogen sends as a JSON or plain-text error response. */
export type ShopifyRouteErrorResult<TError extends ShopifyRouteError = ShopifyRouteError> = {
  /** Set to `error` for an error response. */
  type: "error";
  /** The error that Hydrogen serializes as the response body's `error` field. */
  error: TError;
  /** The HTTP status for the error response. Defaults to `400`. */
  status?: number;
  /** Extra headers for the error response. Hydrogen sets `content-type` for the body format and overrides any value you pass. */
  headers?: HeadersInit;
  /**
   * The body format. `json`, the default, sends `{error: {code, message}}` as `application/json`. `text` sends only `error.message` as `text/plain`. Use `text` for a native form submission, because the browser shows the response as a page.
   */
  format?: "json" | "text";
};

/** The JSON, redirect, or error result that a route handler returns. */
export type ShopifyRouteHandlerResult<
  TData = unknown,
  TError extends ShopifyRouteError = ShopifyRouteError,
> = ShopifyRouteJsonResult<TData> | ShopifyRouteRedirectResult | ShopifyRouteErrorResult<TError>;

/** A route handler function that also carries the pathname and HTTP method it matches. */
export type CallableRouteHandler<
  TContext,
  TResult,
  TPathname extends string = string,
  TMethod extends string = string,
> = ((context: TContext) => Promise<TResult>) & {
  readonly pathname: TPathname;
  readonly method: TMethod;
};

/** A handler for one pathname and HTTP method, created with createShopifyRouteHandler. */
export type ShopifyRouteHandler<
  TPathname extends string = string,
  TMethod extends string = string,
  TContext extends Partial<ShopifyRouteHandlerContext> = ShopifyRouteHandlerContext,
> = CallableRouteHandler<TContext, ShopifyRouteHandlerResult, TPathname, TMethod>;

/**
 * An object of route handlers keyed by name. Pass an array of groups to `handleShopifyRoutes` as `handlers`.
 *
 * @publicDocs
 */
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
  /**
   * Your app's route templates. Hydrogen redirects Liquid-style `?variant=` URLs on your product paths and on Shopify's default product paths.
   */
  routeTemplates?: ShopifyRouteTemplates;
};

/** The request, its context, the Storefront API client, your route templates, your handler groups, and the session when a handler needs it. */
export type HydrogenRoutesOptions<
  THandlers extends ShopifyRouteHandlerGroups | undefined = ShopifyRouteHandlerGroups,
> = HydrogenRoutesBaseOptions & {
  /** The handler groups for your app's custom endpoints. */
  handlers?: THandlers;
} & SessionManagerOption<THandlers>;

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
