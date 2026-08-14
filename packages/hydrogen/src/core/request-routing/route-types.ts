import type { StorefrontClient } from "../../client";
import type { ShopifyRequestContext } from "../request-context";

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

export type ShopifyRouteRedirectResult = {
  type: "redirect";
  location: string;
  /** HTTP redirect status. Defaults to 303 (See Other). */
  status?: number;
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

/**
 * A route handler that decides its own match from the request URL instead of an exact
 * pathname, e.g. `acceptProductVariantId` matching any product page URL.
 *
 * Must decide synchronously: return `null` to pass the request through to the framework
 * (preserving the `handleShopifyRoutes` fast path), or a promise doing the actual work.
 * Unlike exact-pathname handlers, a match handler never produces `405 Method Not Allowed`;
 * requests it does not claim always fall through.
 *
 * Dispatch order: match handlers run before every exact-pathname handler group, regardless
 * of their position in the `handlers` array. Multiple match handlers run in array order.
 */
export type ShopifyRouteMatchHandler = (
  url: URL,
  context: ShopifyRouteHandlerContext,
) => null | Promise<ShopifyRouteHandlerResult>;

export type ShopifyRouteHandlers = ShopifyRouteHandlerGroup | ShopifyRouteMatchHandler;

export type HydrogenRoutesOptions = ShopifyRouteHandlerContext & {
  handlers?: readonly ShopifyRouteHandlers[];
};

export type HydrogenRouteHandler<TExtraOptions extends object = object> = (
  options: HydrogenRoutesOptions & TExtraOptions,
) => null | Promise<Response>;

export type HydrogenRouteInterceptor<TExtraOptions extends object = object> = (
  url: URL,
  ...args: Parameters<HydrogenRouteHandler<TExtraOptions>>
) => ReturnType<HydrogenRouteHandler<TExtraOptions>>;
