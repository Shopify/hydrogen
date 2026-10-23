import { cartQueries, createCartCookie, getCartId } from "@shopify/hydrogen";
import { redirect } from "remix/response/redirect";
import { createController } from "remix/router";

import { BROWSING_HEADERS, PRIVATE_NO_STORE } from "../lib/cache-control.ts";
import { getDiscountRedirectLocation } from "../lib/discount.ts";
import { getPaginationVariables } from "../lib/pagination.ts";
import { localizePath } from "../lib/public/i18n.ts";
import { catalogCache, requireData } from "../lib/storefront.ts";
import { LayoutContext } from "../middleware/layout.ts";
import { routes } from "../routes.ts";
import { CartPage } from "./cart-page.tsx";
import {
  FEATURED_COLLECTION_QUERY,
  HomePage,
  RECOMMENDED_PRODUCTS_QUERY,
  RecommendedProducts,
} from "./home-page.tsx";
import { SEARCH_QUERY, SearchPage, toSearchItems } from "./search-page.tsx";

export default createController(routes, {
  actions: {
    async home({ locale, render, shopify }) {
      const featured = await shopify.storefront.graphql(FEATURED_COLLECTION_QUERY, {
        cache: catalogCache(),
      });
      const featuredCollection = requireData(featured).collections.nodes[0];
      if (!featuredCollection) {
        return new Response("Featured collection not found", { status: 404 });
      }

      return render(
        <HomePage featuredCollection={featuredCollection} pathPrefix={locale.pathPrefix} />,
        { headers: BROWSING_HEADERS },
      );
    },

    /**
     * Below the fold, so it streams in after the rest of the home page. A failure renders
     * no products instead of failing the page.
     */
    async recommendedProducts({ locale, renderFragment, shopify }) {
      const products = await shopify.storefront
        .graphql(RECOMMENDED_PRODUCTS_QUERY, { cache: catalogCache() })
        .then((result) => result.data?.products.nodes ?? [])
        .catch((error: unknown) => {
          console.error(error);
          return [];
        });

      return renderFragment(
        <RecommendedProducts products={products} pathPrefix={locale.pathPrefix} />,
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
          { headers: BROWSING_HEADERS },
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
        { headers: BROWSING_HEADERS },
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

      const headers = new Headers({ "Cache-Control": PRIVATE_NO_STORE });
      if (cart) headers.set("Set-Cookie", createCartCookie(cart.id));
      return redirect(location, { status: 303, headers });
    },
  },
});
