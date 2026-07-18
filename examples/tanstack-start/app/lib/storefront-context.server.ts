import { BUYER_IP_HEADERS, DEVELOPMENT_BUYER_IP, getBuyerIp } from "@shared/buyer-ip";
import { customerAccountConfig, defaultI18n, storefrontConfig } from "@shared/config";
import { getOptionalSharedSecret } from "@shared/private-env";
import { createShopifyRequestContext, createStorefrontClient, getCartId } from "@shopify/hydrogen";
import { createCustomerAccountClient } from "@shopify/hydrogen/customer-account";

import { cartHandlers } from "./cart-handlers";
import { createCustomerSessionManager, customerSession } from "./customer-account";
import { customerSessionHandlers } from "./customer-session-handlers";
import { predictiveSearchHandlers } from "./predictive-search-handlers";
import { storefrontCache } from "./storefront-cache";
import type { HydrogenRequestContext } from "./storefront-context";

const MOCK_SHOP_DOMAIN = "mock.shop";
const MOCK_SHOP_PRIVATE_TOKEN = "mock-private-token";

/**
 * Create every Hydrogen capability once per request. This module is only
 * imported by the server entry so secrets and route-handler queries never
 * enter TanStack Start's client dependency graph.
 */
export async function createHydrogenRequestContext(
  request: Request,
): Promise<HydrogenRequestContext> {
  const shopifyRequestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
  });
  const sessionManager = await createCustomerSessionManager(request);
  const privateStorefrontToken = getOptionalSharedSecret("PRIVATE_STOREFRONT_API_TOKEN");
  const usingMockShop = !privateStorefrontToken;
  const storeDomain = usingMockShop
    ? MOCK_SHOP_DOMAIN
    : (process.env.PUBLIC_STORE_DOMAIN ?? storefrontConfig.storeDomain);

  // The root loader exposes cart state (including checkout URLs) on every page,
  // and /api/cart always returns buyer-specific state. Mark either request as
  // personalized before TanStack renders or a route handler returns so the
  // final response cannot be cached publicly.
  if (getCartId(request) || new URL(request.url).pathname === "/api/cart") {
    shopifyRequestContext.markResponseAsPersonalized("cart");
  }

  if (usingMockShop && !mockShopFallbackWarned) {
    mockShopFallbackWarned = true;
    console.warn(
      "[hydrogen-example-tanstack-start] No PRIVATE_STOREFRONT_API_TOKEN found — " +
        `running against ${MOCK_SHOP_DOMAIN}.`,
    );
  }

  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext: shopifyRequestContext,
    config: {
      storeDomain,
      privateStorefrontToken: privateStorefrontToken ?? MOCK_SHOP_PRIVATE_TOKEN,
      buyerIp: resolveBuyerIp(request.headers, usingMockShop),
      cache: storefrontCache,
    },
  });
  const customerAccountsAvailable = !usingMockShop;
  const customerAccountClient = createCustomerAccountClient({
    shopId: customerAccountConfig.shopId,
    requestContext: shopifyRequestContext,
  });

  return {
    request,
    shopifyRequestContext,
    storefrontClient,
    customerAccount: {
      available: customerAccountsAvailable,
      client: customerAccountClient,
      requestContext: shopifyRequestContext,
      session: customerSession,
      sessionManager,
    },
    cartHandlers,
    shopifyRouteHandlers: [
      cartHandlers,
      predictiveSearchHandlers,
      ...(customerAccountsAvailable ? [customerSessionHandlers] : []),
    ],
  };
}

/**
 * Production runtimes normally provide a trusted buyer-IP header. Local
 * production builds do not, so mock.shop uses the same deterministic fallback
 * as development while real private Storefront clients remain strict.
 */
export function resolveBuyerIp(headers: Pick<Headers, "get">, usingMockShop: boolean): string {
  if (!usingMockShop) return getBuyerIp(headers);

  for (const header of BUYER_IP_HEADERS) {
    const buyerIp = headers.get(header)?.split(",")[0]?.trim();
    if (buyerIp) return buyerIp;
  }

  return DEVELOPMENT_BUYER_IP;
}

/** Commit request-scoped session and Storefront response metadata exactly once. */
export async function finalizeHydrogenResponse(
  response: Response,
  context: HydrogenRequestContext,
): Promise<Response> {
  const mutableResponse = new Response(response.body, response);
  const sessionHeaders = await context.customerAccount.sessionManager.commit?.();
  if (sessionHeaders) appendHeaders(sessionHeaders, mutableResponse.headers);
  context.shopifyRequestContext.applyResponseHeaders(mutableResponse.headers);
  return mutableResponse;
}

function appendHeaders(source: HeadersInit, target: Headers): void {
  new Headers(source).forEach((value, key) => target.append(key, value));
}

let mockShopFallbackWarned = false;
