import type { StorefrontClient } from "../../client";
import type { ShopifyRequestContext } from "../request-context";
import type { ShopifyRouteTemplates } from "../standard-routes/types";

/** A value or a promise for that value. */
type Awaitable<T> = T | Promise<T>;

/** The session storage that route handlers read and write, backed by your app's session implementation. */
export type ShopifyRouteSessionManager = {
  /** Returns the storefront origin that customer account sign-in uses for its OAuth redirect URL. */
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
  /** The session storage for reading and writing customer session data. */
  sessionManager: ShopifyRouteSessionManager;
  /** The Storefront API client for the current request. */
  storefrontClient: StorefrontClient;
  /** The current request's context, the same one the Storefront API client uses. */
  requestContext: ShopifyRequestContext;
};

/** A route handler result that Hydrogen sends as a 200 JSON response. */
export type ShopifyRouteJsonResult<TData = unknown> = {
  /** Set to `"json"` for a JSON response. */
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
  /** Set to `"redirect"` for a redirect response. */
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

/** A route handler result that Hydrogen sends as a JSON error response. */
export type ShopifyRouteErrorResult<TError extends ShopifyRouteError = ShopifyRouteError> = {
  /** Set to `"error"` for an error response. */
  type: "error";
  /** The error that Hydrogen serializes as the response body's `error` field. */
  error: TError;
  /** The HTTP status for the error response. Defaults to 400. */
  status?: number;
  /** Extra headers for the error response. Hydrogen sets `content-type` to `application/json` and overrides any value you pass. */
  headers?: HeadersInit;
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
> = CallableRouteHandler<ShopifyRouteHandlerContext, ShopifyRouteHandlerResult, TPathname, TMethod>;

/**
 * An object of route handlers keyed by name. Pass an array of groups to handleShopifyRoutes as `handlers`.
 *
 * @publicDocs
 */
export type ShopifyRouteHandlerGroup = Record<string, ShopifyRouteHandler>;

/** The request, its context, and the route templates and handler groups to match against. */
export type HydrogenRoutesOptions = ShopifyRouteHandlerContext & {
  /**
   * Your app's custom route templates. The `?variant=` redirect matches product URLs against your product templates and Shopify's default product paths.
   */
  routeTemplates?: ShopifyRouteTemplates;
  /** The route handler groups for your app's custom endpoints. */
  handlers?: readonly ShopifyRouteHandlerGroup[];
};

export type HydrogenRouteHandler<TExtraOptions extends object = object> = (
  options: HydrogenRoutesOptions & TExtraOptions,
) => null | Promise<Response>;

export type HydrogenRouteInterceptor<TExtraOptions extends object = object> = (
  url: URL,
  ...args: Parameters<HydrogenRouteHandler<TExtraOptions>>
) => ReturnType<HydrogenRouteHandler<TExtraOptions>>;
