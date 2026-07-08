import type { StorefrontClient } from "../client";
import type { ShopifyRequestContext } from "./headers";

const HTTP_OK_STATUS = 200;
const HTTP_SEE_OTHER_STATUS = 303;
const HTTP_METHOD_NOT_ALLOWED_STATUS = 405;
const HTTP_BAD_REQUEST_STATUS = 400;

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

export type ShopifyRouteHandlerOptions = ShopifyRouteHandlerContext & {
  handlers?: readonly ShopifyRouteHandlerGroup[];
};

export function createShopifyRouteHandler<
  const TPathname extends string,
  const TMethod extends string,
>(
  pathname: TPathname,
  method: TMethod,
  handler: (context: ShopifyRouteHandlerContext) => Promise<ShopifyRouteHandlerResult>,
): ShopifyRouteHandler<TPathname, TMethod> {
  return createCallableRouteHandler(pathname, method, handler);
}

export function createCallableRouteHandler<
  const TPathname extends string,
  const TMethod extends string,
  TContext,
  TResult,
>(
  pathname: TPathname,
  method: TMethod,
  handler: (context: TContext) => Promise<TResult>,
): CallableRouteHandler<TContext, TResult, TPathname, TMethod> {
  return Object.assign(handler, { pathname, method });
}

export async function handleShopifyRouteHandlers({
  request,
  sessionManager,
  storefrontClient,
  requestContext,
  handlers = [],
}: ShopifyRouteHandlerOptions): Promise<Response | null> {
  const routeHandlers = handlers.flatMap((group) => Object.values(group));
  if (routeHandlers.length === 0) return null;

  const pathname = new URL(request.url).pathname;
  const pathMatches = routeHandlers.filter((entry) => entry.pathname === pathname);
  if (pathMatches.length === 0) return null;

  const match = pathMatches.find((candidate) => candidate.method === request.method);
  if (!match) return new Response("Method Not Allowed", { status: HTTP_METHOD_NOT_ALLOWED_STATUS });

  return createShopifyRouteResponse(
    await match({ request, sessionManager, storefrontClient, requestContext }),
    request,
  );
}

export function createShopifyRouteResponse(
  result: ShopifyRouteHandlerResult,
  request: Request,
): Response {
  if (result.type === "redirect") {
    const headers = new Headers(result.headers);
    headers.set("location", resolveRedirectLocation(result.location, request));
    return new Response(null, {
      status: HTTP_SEE_OTHER_STATUS,
      headers,
    });
  }

  if (result.type === "error") {
    const headers = new Headers(result.headers);
    headers.set("content-type", "application/json");
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status ?? HTTP_BAD_REQUEST_STATUS,
      headers,
    });
  }

  const headers = new Headers(result.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(result.data), {
    status: HTTP_OK_STATUS,
    headers,
  });
}

function resolveRedirectLocation(location: string, request: Request): string {
  // Absolute Location headers are the best common denominator: browsers accept
  // relative redirects, but framework proxy runtimes like Next.js can require
  // absolute URLs when returning a Response from middleware/proxy code.
  return new URL(location, new URL(request.url).origin).toString();
}
