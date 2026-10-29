import { getLogger } from "../logging";
import {
  RATE_LIMITED_STATUS,
  createRateLimitResponseHeaders,
  isStorefrontRateLimitError,
} from "./rate-limit";
import type {
  CallableRouteHandler,
  HydrogenRouteInterceptor,
  ShopifyRouteHandler,
  ShopifyRouteHandlerContext,
  ShopifyRouteHandlerResult,
  ShopifyRedirectStatus,
  ShopifyRouteSessionManager,
} from "./route-types";

const log = getLogger("shopify-routes");
const RATE_LIMITED_MESSAGE = "The request was rate limited. Please try again later.";

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

/**
 * Creates a custom endpoint in your app for one pathname and HTTP method. Collect handlers in an
 * object, and pass an array of handler objects to `handleShopifyRoutes` in its `handlers` option.
 *
 * Use paths other than `/api/cart`, which the cart server handlers use. Return a JSON, redirect, or error result from the handler. Hydrogen sends a JSON result with status `200`, an error result with status `400` by default, and a redirect result with status `303` by default. When a redirect result uses a status other than `301`, `302`, `303`, 307, or 308, the promise from `handleShopifyRoutes` rejects. When the handler throws a `StorefrontApiError` with status `429`, `handleShopifyRoutes` answers with a `429` error result (`code: "rate_limited"`) and a validated `Retry-After` header instead of rejecting; any other thrown error still rejects.
 *
 * Annotate the handler's context parameter with only the fields the handler reads, for example
 * `Omit<ShopifyRouteHandlerContext, "sessionManager">`, so apps without a session manager can
 * register it. Hydrogen infers the context only from an annotated parameter. A handler with no
 * parameter, or with an unannotated destructured parameter, gets the full context, so
 * `handleShopifyRoutes` still requires `sessionManager` for it.
 *
 * Marking `sessionManager` optional in the annotation doesn't make it optional at runtime. It
 * still makes `sessionManager` required, and when an untyped caller omits it, Hydrogen passes a
 * stand-in that throws when the handler uses it. A check such as `if (sessionManager)` is always
 * true, so don't use it as a fallback.
 *
 * @param pathname The exact URL pathname that the handler matches. Hydrogen doesn't match path parameters or prefixes.
 * @param method The HTTP method that the handler matches, in uppercase, such as `POST`.
 * @param handler The function that receives the request, its context, the session manager, and the Storefront API client, and returns a JSON, redirect, or error result.
 * @returns The handler to add to a handler object.
 * @publicDocs
 */
export function createShopifyRouteHandler<
  const TPathname extends string,
  const TMethod extends string,
  TContext extends Partial<ShopifyRouteHandlerContext> = ShopifyRouteHandlerContext,
>(
  pathname: TPathname,
  method: TMethod,
  handler: (context: TContext) => Promise<ShopifyRouteHandlerResult>,
): ShopifyRouteHandler<TPathname, TMethod, TContext> {
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
  const routeHandlers = handlers.flatMap((group) => Object.values(group));
  if (routeHandlers.length === 0) return null;

  const pathMatches = routeHandlers.filter((entry) => entry.pathname === url.pathname);
  if (pathMatches.length === 0) return null;

  const match = pathMatches.find((candidate) => candidate.method === request.method);
  if (!match)
    return Promise.resolve(
      new Response("Method Not Allowed", { status: HTTP_METHOD_NOT_ALLOWED_STATUS }),
    );

  const context = {
    request,
    sessionManager: sessionManager ?? createMissingSessionManager(url.pathname),
    storefrontClient,
    requestContext,
  };
  return match(context).then(
    (result) => createShopifyRouteResponse(result, request),
    (error: unknown) => {
      // Only a Storefront API `429` becomes a caller `429`. Every other failure keeps propagating
      // so the application boundary decides; a direct handler call (`cartHandlers.get()`) still throws.
      if (!isStorefrontRateLimitError(error)) throw error;
      log.error("storefront api rate limited the route handler", { error });
      return createShopifyRouteResponse(
        {
          type: "error",
          error: { code: "rate_limited", message: RATE_LIMITED_MESSAGE },
          status: RATE_LIMITED_STATUS,
          headers: createRateLimitResponseHeaders(error),
        },
        request,
      );
    },
  );
};

// The types already require `sessionManager` for handlers that read it; this
// covers untyped callers, which would otherwise read `undefined` deep inside a handler.
function createMissingSessionManager(pathname: string): ShopifyRouteSessionManager {
  const fail = (): never => {
    throw new Error(
      `The ${pathname} handler needs a session. Pass sessionManager to handleShopifyRoutes.`,
    );
  };
  return {
    getSessionOrigin: fail,
    getSessionItem: fail,
    setSessionItem: fail,
    removeSessionItem: fail,
  };
}

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
