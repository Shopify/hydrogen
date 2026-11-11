import { cartQueries, createCartCookie, getCartId } from "@shopify/hydrogen";
import { redirect } from "react-router";

import type { Route } from "./+types/($locale).discount.$code";

/**
 * Automatically applies a discount found on the url
 * If a cart exists it's updated with the discount, otherwise a cart is created with the discount already applied
 *
 * @example
 * Example path applying a discount and optional redirecting (defaults to the home page)
 * ```js
 * /discount/FREESHIPPING?redirect=/products
 *
 * ```
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { storefront } = context;
  const { code } = params;

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const redirectTarget = getRedirectTarget(
    searchParams.get("redirect") || searchParams.get("return_to") || "/",
    url.origin,
  );

  searchParams.delete("redirect");
  searchParams.delete("return_to");
  for (const [name, value] of searchParams) redirectTarget.searchParams.append(name, value);

  const redirectUrl = `${redirectTarget.pathname}${redirectTarget.search}${redirectTarget.hash}`;

  if (!code) {
    return redirect(redirectUrl);
  }

  const cartId = getCartId(request);
  const updatedCart = cartId
    ? (
        await storefront.mutate(cartQueries.cartDiscountCodesUpdate, {
          variables: { cartId, discountCodes: [code] },
        })
      ).cartDiscountCodesUpdate?.cart
    : (
        await storefront.mutate(cartQueries.cartCreate, {
          variables: { input: { discountCodes: [code] } },
        })
      ).cartCreate?.cart;
  const headers = updatedCart
    ? new Headers({ "set-cookie": createCartCookie(updatedCart.id) })
    : undefined;

  // Using set-cookie on a 303 redirect will not work if the domain origin have port number (:3000)
  // If there is no cart id and a new cart id is created in the progress, it will not be set in the cookie
  // on localhost:3000
  return redirect(redirectUrl, {
    status: 303,
    headers,
  });
}

/**
 * Returns the redirect target as a URL on this site, or the home page when the target leaves the
 * site, to prevent phishing attacks. Redirect to the parsed path, never to the raw value:
 * browsers read `/\host` and `/x/..//host` as another host, so a raw value that looks like a path
 * can still leave the site.
 */
function getRedirectTarget(target: string, origin: string): URL {
  const home = new URL("/", origin);
  if (!URL.canParse(target, origin)) return home;

  const url = new URL(target, origin);
  // Compare the URL itself and not `url.origin`: a `blob:` URL reports the origin of the URL it
  // wraps, and its path is that whole URL.
  return url.href.startsWith(`${origin}/`) && !url.pathname.startsWith("//") ? url : home;
}
