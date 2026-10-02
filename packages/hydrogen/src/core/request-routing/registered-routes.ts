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
  ShopifyRouteResponseResult,
  ShopifyRedirectStatus,
  ShopifyRouteSessionManager,
} from "./route-types";

/** `method` value that matches every HTTP method. */
export const ANY_METHOD = "*";
/** `pathname` suffix that turns a handler into a prefix match. */
export const WILDCARD_PATHNAME_SUFFIX = "/*";

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

  const pathMatches = matchRouteHandlers(routeHandlers, url.pathname);
  if (pathMatches.length === 0) return null;

  const match = pathMatches.find(
    (candidate) => candidate.method === request.method || candidate.method === ANY_METHOD,
  );
  if (!match)
    return Promise.resolve(
      new Response("Method Not Allowed", { status: HTTP_METHOD_NOT_ALLOWED_STATUS }),
    );

  return match(context).then((result) => createShopifyRouteResponse(result, request));
};

/** Literal pathnames match exactly and win over `/*` wildcard pathnames. */
function matchRouteHandlers(
  routeHandlers: ShopifyRouteHandler[],
  pathname: string,
): ShopifyRouteHandler[] {
  const exactMatches = routeHandlers.filter((handler) => handler.pathname === pathname);
  if (exactMatches.length > 0) return exactMatches;

  return routeHandlers.filter((handler) => matchesWildcardPathname(handler.pathname, pathname));
}

function matchesWildcardPathname(handlerPathname: string, pathname: string): boolean {
  if (!handlerPathname.endsWith(WILDCARD_PATHNAME_SUFFIX)) return false;

  const base = handlerPathname.slice(0, -WILDCARD_PATHNAME_SUFFIX.length);
  return pathname === base || pathname.startsWith(`${base}/`);
}

function createShopifyRouteResponse(result: ShopifyRouteHandlerResult, request: Request): Response {
  if (result.type === "response") return result.response;

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
