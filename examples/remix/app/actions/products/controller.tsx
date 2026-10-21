import { getSelectedProductOptions } from "@shopify/hydrogen";
import { createController } from "remix/router";

import { redirectIfHandleIsLocalized } from "../../lib/redirect.ts";
import { catalogCache, requireData } from "../../lib/storefront.ts";
import { routes } from "../../routes.ts";
import { NotFoundPage } from "../../ui/error-pages.tsx";
import { PRODUCT_QUERY, ProductPage } from "./page.tsx";

export default createController(routes.products, {
  actions: {
    async show({ locale, params, render, request, shopify, url }) {
      const result = await shopify.storefront.graphql(PRODUCT_QUERY, {
        cache: catalogCache(),
        variables: {
          handle: params.handle,
          // `?Color=Red&Size=M` selects a variant. Unknown params are ignored by the query.
          selectedOptions: getSelectedProductOptions({ searchParams: url.searchParams }),
        },
      });
      const product = requireData(result).product;
      if (!product?.id) {
        return render(<NotFoundPage pathname={new URL(request.url).pathname} />, { status: 404 });
      }

      const localizedRedirect = redirectIfHandleIsLocalized(request, {
        handle: params.handle,
        data: product,
      });
      if (localizedRedirect) return localizedRedirect;

      return render(
        <ProductPage product={product} pathPrefix={locale.pathPrefix} search={url.search} />,
      );
    },
  },
});
