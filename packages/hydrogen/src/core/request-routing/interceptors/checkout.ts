import type { StorefrontClient } from "../../../client";
import { getCart, getCartId } from "../../cart/get-cart";
import { getLogger } from "../../logging";
import { BUY_PERMALINK_RE, CHECKOUT_RE, isHydrogenServerHandoffPath } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";

const log = getLogger("checkout");
const MOCK_SHOP_PERMALINK_ORIGIN = "https://demostore.mock.shop";

export const handleCheckoutRedirect: HydrogenRouteInterceptor = (
  url,
  { request, storefrontClient },
) => {
  if (!isHydrogenServerHandoffPath(url.pathname)) {
    return null;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return Promise.resolve(new Response("Method Not Allowed", { status: 405 }));
  }

  const redirectUrlPromise = CHECKOUT_RE.test(url.pathname)
    ? getCheckoutRedirectUrl(request, storefrontClient)
    : getCartRedirectUrl(request, storefrontClient);

  return redirectUrlPromise
    .then((redirectUrl) => {
      if (redirectUrl.pathname !== "/") {
        mergeSearchParams(redirectUrl, url.searchParams);
        redirectUrl.searchParams.set("payment", url.searchParams.get("payment") ?? "shop_pay");
      }

      return new Response(null, {
        status: 302,
        headers: { location: redirectUrl.toString() },
      });
    })
    .catch((error) => {
      log.error("checkout redirect request failed", { error });
      const message = error instanceof Error ? error.message : "Internal redirect error";

      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    });
};

export const handleBuyPermalinkRedirect: HydrogenRouteInterceptor = (
  url,
  { request, storefrontClient },
) => {
  if (!BUY_PERMALINK_RE.test(url.pathname)) {
    return null;
  }

  if (request.method !== "GET") {
    return Promise.resolve(new Response("Method Not Allowed", { status: 405 }));
  }

  // UCP permalink response shape (303, no-store, no-referrer), forwarded verbatim since re-encoding would alter `continue_to`.
  // https://ucp.dev/2026-08-25/specification/permalink/#redirect-resolution
  const location = `${getPermalinkOrigin(storefrontClient.storeUrl)}${url.pathname}${url.search}`;
  return Promise.resolve(
    new Response(null, {
      status: 303,
      headers: { location, "cache-control": "no-store", "referrer-policy": "no-referrer" },
    }),
  );
};

async function getCheckoutRedirectUrl(
  request: Request,
  storefrontClient: StorefrontClient,
): Promise<URL> {
  const cartId = getCartId(request);
  if (!cartId) return new URL("/", request.url);

  const result = await getCart(cartId, storefrontClient);
  return result.cart?.checkoutUrl ? new URL(result.cart.checkoutUrl) : new URL("/", request.url);
}

async function getCartRedirectUrl(
  request: Request,
  storefrontClient: StorefrontClient,
): Promise<URL> {
  const sourceUrl = new URL(request.url);
  const redirectUrl = new URL(sourceUrl.pathname, getPermalinkOrigin(storefrontClient.storeUrl));

  const cartId = getCartId(request);
  if (!cartId) return redirectUrl;

  try {
    const result = await getCart(cartId, storefrontClient);
    if (result.cart?.checkoutUrl) {
      mergeSearchParams(redirectUrl, new URL(result.cart.checkoutUrl).searchParams);
    }
  } catch (error) {
    log.warn("checkout redirect could not load cart permalink tracking params", { error });
  }

  return redirectUrl;
}

function getPermalinkOrigin(storeUrl: string): string {
  const url = new URL(storeUrl);
  return isMockShopHost(url.hostname) ? MOCK_SHOP_PERMALINK_ORIGIN : url.origin;
}

// mock.shop serves many stores, each on its own host (pets.mock.shop, ...), and
// none of them renders cart or buy permalinks, so every mock host hands off to the demo store.
function isMockShopHost(hostname: string): boolean {
  return hostname === "mock.shop" || hostname.endsWith(".mock.shop");
}

function mergeSearchParams(target: URL, source: URLSearchParams): void {
  for (const [key, value] of source) {
    if (!target.searchParams.has(key)) target.searchParams.append(key, value);
  }
}
