import type { PrivateStorefrontClient } from "../../client";
import { getCart, getCartId } from "../cart/get-cart";
import type { HydrogenRoutesOptions } from "../handle-shopify-routes";
import { CART_PERMALINK_RE, CHECKOUT_RE } from "../url";

export async function handleCheckoutRedirect({
  request,
  storefrontClient,
}: HydrogenRoutesOptions): Promise<Response | null> {
  const url = new URL(request.url);
  if (!CHECKOUT_RE.test(url.pathname) && !CART_PERMALINK_RE.test(url.pathname)) {
    return null;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let redirectUrl: URL;
  try {
    redirectUrl = CHECKOUT_RE.test(url.pathname)
      ? await getCheckoutRedirectUrl(request, storefrontClient)
      : await getCartRedirectUrl(request, storefrontClient);
  } catch (error) {
    console.error("Checkout redirect request failed:", error);
    const message = error instanceof Error ? error.message : "Internal redirect error";

    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  if (redirectUrl.pathname !== "/") {
    mergeSearchParams(redirectUrl, url.searchParams);
    redirectUrl.searchParams.set("payment", url.searchParams.get("payment") ?? "shop_pay");
  }

  return Response.redirect(redirectUrl, 302);
}

async function getCheckoutRedirectUrl(
  request: Request,
  storefrontClient: PrivateStorefrontClient,
): Promise<URL> {
  const cartId = getCartId(request);
  if (!cartId) return new URL("/", request.url);

  const result = await getCart(cartId, storefrontClient);
  return result.cart.checkoutUrl ? new URL(result.cart.checkoutUrl) : new URL("/", request.url);
}

async function getCartRedirectUrl(
  request: Request,
  storefrontClient: PrivateStorefrontClient,
): Promise<URL> {
  const sourceUrl = new URL(request.url);
  const redirectUrl = new URL(sourceUrl.pathname, storefrontClient.storeUrl);

  const cartId = getCartId(request);
  if (!cartId) return redirectUrl;

  try {
    const result = await getCart(cartId, storefrontClient);
    if (result.cart.checkoutUrl) {
      mergeSearchParams(redirectUrl, new URL(result.cart.checkoutUrl).searchParams);
    }
  } catch (error) {
    console.warn("Checkout redirect could not load cart permalink tracking params:", error);
  }

  return redirectUrl;
}

function mergeSearchParams(target: URL, source: URLSearchParams): void {
  for (const [key, value] of source) {
    if (!target.searchParams.has(key)) target.searchParams.append(key, value);
  }
}
