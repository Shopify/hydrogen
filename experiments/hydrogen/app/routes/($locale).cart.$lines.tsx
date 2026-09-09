import { cartQueries, createCartCookie } from "@shopify/hydrogen";
import { redirect } from "react-router";

import type { Route } from "./+types/($locale).cart.$lines";

/**
 * Automatically creates a new cart based on the URL and redirects straight to checkout.
 * Expected URL structure:
 * ```js
 * /cart/<variant_id>:<quantity>
 *
 * ```
 *
 * More than one `<variant_id>:<quantity>` separated by a comma, can be supplied in the URL, for
 * carts with more than one product variant.
 *
 * @example
 * Example path creating a cart with two product variants, different quantities, and a discount code in the querystring:
 * ```js
 * /cart/41007289663544:1,41007289696312:2?discount=HYDROBOARD
 *
 * ```
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { storefront } = context;
  const { lines } = params;
  if (!lines) return redirect("/cart");
  const linesMap = lines.split(",").map((line: string) => {
    const lineDetails = line.split(":");
    const variantId = lineDetails[0];
    const quantity = parseInt(lineDetails[1], 10);

    return {
      merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
      quantity,
    };
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const discount = searchParams.get("discount");
  const discountArray = discount ? [discount] : [];

  const result = await storefront.mutate(cartQueries.cartCreate, {
    variables: {
      input: {
        lines: linesMap,
        discountCodes: discountArray,
      },
    },
  });

  const cartCreate = result.cartCreate;
  const cartResult = cartCreate?.cart;

  if (result.errors?.length || cartCreate?.userErrors?.length || !cartResult) {
    throw new Response("Link may be expired. Try checking the URL.", {
      status: 410,
    });
  }

  // Update cart id in cookie
  const headers = new Headers({ "set-cookie": createCartCookie(cartResult.id) });

  // redirect to checkout
  if (cartResult.checkoutUrl) {
    return redirect(cartResult.checkoutUrl, { headers });
  } else {
    throw new Error("No checkout URL found");
  }
}

export default function Component() {
  return null;
}
