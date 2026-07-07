import { getBuyerIp } from "@shared/buyer-ip";
import { customerAccountConfig, defaultI18n, storefrontConfig } from "@shared/config";
import { getOptionalSharedSecret } from "@shared/private-env";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRedirects,
  handleShopifyRoutes,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { createCustomerAccountClient } from "@shopify/hydrogen/customer-account";
import type { WritableCustomerSessionManager } from "@shopify/hydrogen/customer-account";
import type { MiddlewareFunction } from "react-router";

import { cartHandlers } from "./cart-handlers";
import {
  createCustomerSessionManager,
  customerAccountContext,
  customerSession,
} from "./customer-account";
import { customerSessionHandlers } from "./customer-session-handlers";
import { predictiveSearchHandlers } from "./predictive-search-handlers";
import { routeTemplates } from "./route-templates";
import { storefrontCache } from "./storefront-cache";
import { storefrontClientContext } from "./storefront-context";

/**
 * Root middleware — the single Hydrogen request lifecycle entry point.
 *
 * Follows `hydrogen-request-handlers` / `references/frameworks.md` (React Router
 * shape) and `hydrogen-storefront-client` / `references/react-router.md`:
 *
 *   Request
 *     -> handleShopifyRoutes() before framework routing
 *     -> framework router (next())
 *     -> handleShopifyRedirects() only after a 404
 *     -> framework 404 page
 *
 * One request-scoped private Storefront client is created per request and
 * shared by all loaders, cart handlers, and predictive-search handlers. SFAPI
 * response headers are merged onto the final response via
 * `requestContext.applyResponseHeaders`.
 *
 * When no `PRIVATE_STOREFRONT_API_TOKEN` is provisioned (e.g. local dev without
 * the decrypted ejson secrets), the client falls back to the public mock.shop
 * endpoint using its well-known `mock-private-token` (see the repo's
 * `.env.mockShop`) so the example runs with zero secrets. With a real private
 * token present, the configured store is used unchanged.
 *
 * Customer Accounts: a single `EncryptedCookieCustomerSession` session manager
 * (persistent across the OAuth login → callback redirect) is shared by
 * `handleShopifyRoutes` and the account route loader. The customer account
 * handlers are only registered when a real private token is present (not
 * mock.shop); on mock.shop the four `/account/*` paths fall through to the
 * catch-all 404 and the `/account` route renders a "requires a real store"
 * notice. The session manager is committed onto every framework-router
 * response via `finalizeResponse` so token refreshes performed during `next()`
 * are flushed as `Set-Cookie`.
 */

const MOCK_SHOP_DOMAIN = "mock.shop";
const MOCK_SHOP_PRIVATE_TOKEN = "mock-private-token";

export const storefrontMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
  });

  const buyerIp = getBuyerIp(request.headers);
  const sessionManager = await createCustomerSessionManager(request);

  // A module-level LRU cache for non-personalized catalog reads
  // (engineering.md F2). Passing `cache` to `createStorefrontClient` lets the
  // client wrap its fetch internally; caching only engages when a `cache:`
  // strategy is passed per query — catalog loaders pass `Cache.short()` /
  // `Cache.long()`, while personalized reads (cart, buyer-context state) pass
  // no strategy.

  const privateStorefrontToken = getOptionalSharedSecret("PRIVATE_STOREFRONT_API_TOKEN");
  const usingMockShop = !privateStorefrontToken;
  const storeDomain = usingMockShop
    ? MOCK_SHOP_DOMAIN
    : (process.env.PUBLIC_STORE_DOMAIN ?? storefrontConfig.storeDomain);
  const resolvedPrivateStorefrontToken = privateStorefrontToken ?? MOCK_SHOP_PRIVATE_TOKEN;

  // No private token -> fall back to mock.shop so the example runs locally with
  // zero secrets. mock.shop accepts the well-known `mock-private-token` for the
  // private-client auth header, so we keep `type: "private"` (preserving the
  // request-scoped private client contract the handlers/context expect).
  if (usingMockShop && !mockShopFallbackWarned) {
    mockShopFallbackWarned = true;
    console.warn(
      `[hydrogen-example-react-router] No PRIVATE_STOREFRONT_API_TOKEN found — ` +
        `running against mock.shop (${MOCK_SHOP_DOMAIN}). Decrypt secrets ` +
        `(pnpm examples:secrets:decrypt) to hit a real store.`,
    );
  }

  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken: resolvedPrivateStorefrontToken,
      buyerIp,
      cache: storefrontCache,
    },
  });

  // Customer Accounts are only available on a real store: mock.shop has no
  // Customer Account API and no HTTPS origin for the OAuth callback. The
  // client is still created on both branches (cheap, no network) so the
  // context shape stays uniform; `available` gates handler registration and
  // the header link.
  const customerAccountsAvailable = !usingMockShop;
  const customerAccountClient = createCustomerAccountClient({
    shopId: customerAccountConfig.shopId,
    requestContext,
  });

  // The customer account handlers are conditionally registered: on mock.shop
  // they are omitted so `/account/login` etc. fall through to the catch-all
  // 404 (the `/account` route itself renders a notice).
  const handlers = [
    cartHandlers,
    predictiveSearchHandlers,
    ...(customerAccountsAvailable ? [customerSessionHandlers] : []),
  ];

  const shopifyRoute = await handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers,
  });
  // `handleShopifyRoutes` already commits the session manager (the customer
  // account handlers call `commitSession` and the result headers carry the
  // `Set-Cookie`) and applies SFAPI response headers, so the early-return
  // path needs no further post-processing.
  if (shopifyRoute) return shopifyRoute;

  // Loaders read both clients from context. Handlers don't read context, so
  // this only needs to be set on the framework-router path (after the
  // `shopifyRoute` early-return).
  context.set(storefrontClientContext, storefrontClient);
  context.set(customerAccountContext, {
    available: customerAccountsAvailable,
    client: customerAccountClient,
    requestContext,
    session: customerSession,
    sessionManager,
  });

  const response = await next();
  let finalResponse = response;
  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request,
      storefrontClient,
      routeTemplates,
    });
    if (redirect) finalResponse = redirect;
  }
  return finalizeResponse(requestContext, finalResponse, sessionManager);
};

/**
 * Post-process the framework-router response: commit any pending customer
 * session mutations (e.g. a token refresh performed by the account route
 * loader during `next()`) onto the response as `Set-Cookie`, then merge SFAPI
 * response headers. Mirrors the idiomatic React Router pattern of a middleware
 * wrapping `next()` and post-processing the response.
 */
async function finalizeResponse(
  requestContext: ShopifyRequestContext,
  response: Response,
  sessionManager: WritableCustomerSessionManager,
): Promise<Response> {
  const mutable = new Response(response.body, response);
  const sessionHeaders = await sessionManager.commit?.();
  if (sessionHeaders) appendHeaders(sessionHeaders, mutable.headers);
  requestContext.applyResponseHeaders(mutable.headers);
  return mutable;
}

function appendHeaders(source: HeadersInit, target: Headers): void {
  new Headers(source).forEach((value, key) => target.append(key, value));
}

let mockShopFallbackWarned = false;
