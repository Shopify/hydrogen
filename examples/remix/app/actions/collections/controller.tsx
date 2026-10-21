import { createController } from "remix/router";

import { getPaginationVariables } from "../../lib/pagination.ts";
import { redirectIfHandleIsLocalized } from "../../lib/redirect.ts";
import { catalogCache, requireData } from "../../lib/storefront.ts";
import { routes } from "../../routes.ts";
import { NotFoundPage } from "../../ui/error-pages.tsx";
import {
  AllProductsPage,
  CATALOG_QUERY,
  COLLECTION_QUERY,
  COLLECTIONS_QUERY,
  CollectionPage,
  CollectionsPage,
} from "./pages.tsx";

export default createController(routes.collections, {
  actions: {
    async index({ locale, render, request, shopify, url }) {
      const result = await shopify.storefront.graphql(COLLECTIONS_QUERY, {
        cache: catalogCache(),
        variables: getPaginationVariables(url, { pageBy: 4 }),
      });
      return render(
        <CollectionsPage
          collections={requireData(result).collections}
          pathPrefix={locale.pathPrefix}
          url={new URL(request.url)}
        />,
      );
    },

    async all({ locale, render, request, shopify, url }) {
      const result = await shopify.storefront.graphql(CATALOG_QUERY, {
        cache: catalogCache(),
        variables: getPaginationVariables(url, { pageBy: 8 }),
      });
      return render(
        <AllProductsPage
          products={requireData(result).products}
          pathPrefix={locale.pathPrefix}
          url={new URL(request.url)}
        />,
      );
    },

    async show({ locale, params, render, request, shopify, url }) {
      const result = await shopify.storefront.graphql(COLLECTION_QUERY, {
        cache: catalogCache(),
        variables: { handle: params.handle, ...getPaginationVariables(url, { pageBy: 8 }) },
      });
      const collection = requireData(result).collection;
      if (!collection) {
        return render(<NotFoundPage pathname={new URL(request.url).pathname} />, { status: 404 });
      }

      const localizedRedirect = redirectIfHandleIsLocalized(request, {
        handle: params.handle,
        data: collection,
      });
      if (localizedRedirect) return localizedRedirect;

      return render(
        <CollectionPage
          collection={collection}
          pathPrefix={locale.pathPrefix}
          url={new URL(request.url)}
        />,
      );
    },
  },
});
