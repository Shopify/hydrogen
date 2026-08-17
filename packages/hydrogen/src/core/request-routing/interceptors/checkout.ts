import type { StorefrontClient } from "../../../client";
import { getCart, getCartId } from "../../cart/get-cart";
import { getLogger } from "../../logging";
import { CHECKOUT_RE, isHydrogenServerHandoffPath } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";

const log = getLogger("checkout");

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
  const redirectUrl = new URL(sourceUrl.pathname, storefrontClient.storeUrl);

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

function mergeSearchParams(target: URL, source: URLSearchParams): void {
  for (const [key, value] of source) {
    if (!target.searchParams.has(key)) target.searchParams.append(key, value);
  }
}
