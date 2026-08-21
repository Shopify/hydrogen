import type {
  CallableRouteHandler,
  HydrogenRouteInterceptor,
  ShopifyRouteHandler,
  ShopifyRouteHandlerContext,
  ShopifyRouteHandlerResult,
  ShopifyRedirectStatus,
} from "./route-types";

export type {
  CallableRouteHandler,
  ShopifyRouteError,
  ShopifyRouteErrorResult,
  ShopifyRouteHandler,
  ShopifyRouteHandlerContext,
  ShopifyRouteHandlerGroup,
  ShopifyRouteHandlerResult,
  ShopifyRouteJsonResult,
  ShopifyRouteRedirectResult,
  ShopifyRedirectStatus,
  ShopifyRouteSessionManager,
} from "./route-types";

const HTTP_OK_STATUS = 200;
const HTTP_SEE_OTHER_STATUS = 303;
const HTTP_METHOD_NOT_ALLOWED_STATUS = 405;
const HTTP_BAD_REQUEST_STATUS = 400;
const VALID_REDIRECT_STATUSES = [
  301, 302, 303, 307, 308,
] as const satisfies readonly ShopifyRedirectStatus[];

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

export const handleShopifyRouteHandlers: HydrogenRouteInterceptor = (
  url,
  { request, sessionManager, storefrontClient, requestContext, handlers = [] },
) => {
  const context = { request, sessionManager, storefrontClient, requestContext };
  const routeHandlers = handlers.flatMap((group) => Object.values(group));
  if (routeHandlers.length === 0) return null;

  const pathMatches = routeHandlers.filter((entry) => entry.pathname === url.pathname);
  if (pathMatches.length === 0) return null;

  const match = pathMatches.find((candidate) => candidate.method === request.method);
  if (!match)
    return Promise.resolve(
      new Response("Method Not Allowed", { status: HTTP_METHOD_NOT_ALLOWED_STATUS }),
    );

  return match(context).then((result) => createShopifyRouteResponse(result, request));
};

function createShopifyRouteResponse(result: ShopifyRouteHandlerResult, request: Request): Response {
  if (result.type === "redirect") {
    const headers = new Headers(result.headers);
    headers.set("location", resolveRedirectLocation(result.location, request));
    return new Response(null, {
      status: getRedirectStatus(result.status),
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

function getRedirectStatus(status: ShopifyRedirectStatus | undefined): ShopifyRedirectStatus {
  const redirectStatus = status ?? HTTP_SEE_OTHER_STATUS;
  if (VALID_REDIRECT_STATUSES.some((validStatus) => validStatus === redirectStatus)) {
    return redirectStatus;
  }

  throw new Error(
    `Invalid Shopify route redirect status ${redirectStatus}. Expected one of: ${VALID_REDIRECT_STATUSES.join(", ")}.`,
  );
}

function resolveRedirectLocation(location: string, request: Request): string {
  // Absolute Location headers are the best common denominator: browsers accept
  // relative redirects, but framework proxy runtimes like Next.js can require
  // absolute URLs when returning a Response from middleware/proxy code.
  return new URL(location, new URL(request.url).origin).toString();
}
