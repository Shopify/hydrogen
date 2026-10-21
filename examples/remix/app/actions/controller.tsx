import { cartQueries, createCartCookie, getCartId } from "@shopify/hydrogen";
import { redirect } from "remix/response/redirect";
import { createController } from "remix/router";

import { getPaginationVariables } from "../lib/pagination.ts";
import { localizePath } from "../lib/public/i18n.ts";
import { catalogCache, requireData } from "../lib/storefront.ts";
import { LayoutContext } from "../middleware/layout.ts";
import { routes } from "../routes.ts";
import { CartPage } from "./cart-page.tsx";
import { FEATURED_COLLECTION_QUERY, HomePage, RECOMMENDED_PRODUCTS_QUERY } from "./home-page.tsx";
import { SEARCH_QUERY, SearchPage, toSearchItems } from "./search-page.tsx";

export default createController(routes, {
  actions: {
    async home({ locale, render, shopify }) {
      const { storefront } = shopify;
      const [featured, recommended] = await Promise.all([
        storefront.graphql(FEATURED_COLLECTION_QUERY, { cache: catalogCache() }),
        // Below the fold: a failure renders the page without recommendations.
        storefront
          .graphql(RECOMMENDED_PRODUCTS_QUERY, { cache: catalogCache() })
          .catch((error: unknown) => {
            console.error(error);
            return null;
          }),
      ]);
      const featuredCollection = requireData(featured).collections.nodes[0];
      if (!featuredCollection) {
        return new Response("Featured collection not found", { status: 404 });
      }

      return render(
        <HomePage
          featuredCollection={featuredCollection}
          recommendedProducts={recommended?.data?.products.nodes ?? null}
          pathPrefix={locale.pathPrefix}
        />,
      );
    },

    async cart({ get, locale, render }) {
      const layout = await get(LayoutContext)();
      return render(<CartPage initialData={layout.cart} pathPrefix={locale.pathPrefix} />);
    },

    async search({ locale, render, request, shopify, url }) {
      const term = url.searchParams.get("q")?.trim() ?? "";
      if (!term) {
        return render(
          <SearchPage
            term=""
            items={null}
            pathPrefix={locale.pathPrefix}
            url={new URL(request.url)}
          />,
        );
      }

      const result = await shopify.storefront.graphql(SEARCH_QUERY, {
        cache: catalogCache(),
        variables: { ...getPaginationVariables(url, { pageBy: 8 }), term },
      });

      return render(
        <SearchPage
          term={term}
          items={result.data ? toSearchItems(result.data) : null}
          error={result.errors?.map(({ message }) => message).join(", ")}
          pathPrefix={locale.pathPrefix}
          url={new URL(request.url)}
        />,
      );
    },

    /**
     * Applies a discount from a link such as `/discount/SUMMER?redirect=/products/hat`.
     * Updates the current cart, or creates one with the code applied.
     */
    async discount({ locale, params, request, shopify, url }) {
      const { storefront } = shopify;
      const location = getDiscountRedirectLocation(url, locale.pathPrefix);

      const cartId = getCartId(request);
      const discountCodes = [params.code];
      const cart = cartId
        ? (
            await storefront.graphql(cartQueries.cartDiscountCodesUpdate, {
              variables: { cartId, discountCodes },
            })
          ).data?.cartDiscountCodesUpdate?.cart
        : (
            await storefront.graphql(cartQueries.cartCreate, {
              variables: { input: { discountCodes } },
            })
          ).data?.cartCreate?.cart;

      const headers = new Headers({ "Cache-Control": "private, no-store" });
      if (cart) headers.set("Set-Cookie", createCartCookie(cart.id));
      return redirect(location, { status: 303, headers });
    },
  },
});

/**
 * Resolves the discount link's `redirect` (or `return_to`) parameter to a same-origin
 * path in the active locale. The target is parsed rather than string-matched, because
 * browsers read values such as `/\example.com` and `/<tab>/example.com` as `//example.com`.
 * The link's other query parameters are kept.
 */
function getDiscountRedirectLocation(url: URL, pathPrefix: string): string {
  const requested = url.searchParams.get("redirect") || url.searchParams.get("return_to") || "/";
  let target = new URL(requested, url.origin);
  if (target.origin !== url.origin || target.pathname.startsWith("//")) {
    target = new URL("/", url.origin);
  }

  for (const [key, value] of url.searchParams) {
    if (key !== "redirect" && key !== "return_to") target.searchParams.append(key, value);
  }

  const isLocalized =
    pathPrefix !== "" &&
    (target.pathname === pathPrefix || target.pathname.startsWith(`${pathPrefix}/`));
  const pathname = isLocalized ? target.pathname : localizePath(target.pathname, pathPrefix);
  return `${pathname}${target.search}${target.hash}`;
}
