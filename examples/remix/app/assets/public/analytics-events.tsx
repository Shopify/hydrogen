import { AnalyticsEvent } from "@shopify/hydrogen";
import type { CurrencyCode } from "@shopify/hydrogen/storefront-api-types";
import { clientEntry, type Handle } from "remix/component";

import { getAnalytics } from "./analytics.ts";

/** The product fields Shopify analytics requires, as serializable island props. */
type ProductViewed = {
  id: string;
  title: string;
  price: { amount: string; currencyCode: CurrencyCode };
  vendor: string;
  variantId: string;
  variantTitle: string;
  quantity: number;
};

/**
 * Route-level analytics views. Each renders nothing and publishes once per resource, so
 * variant changes and in-place navigations to the same resource don't republish.
 */
export const ProductView = clientEntry(
  import.meta.url,
  function ProductView(handle: Handle<{ product: ProductViewed }>) {
    let published: string | undefined;
    return () => {
      const { product } = handle.props;
      if (product.id !== published) {
        published = product.id;
        handle.queueTask(() => {
          getAnalytics()?.publish(AnalyticsEvent.PRODUCT_VIEWED, { products: [product] });
        });
      }
      return null;
    };
  },
);

export const CollectionView = clientEntry(
  import.meta.url,
  function CollectionView(handle: Handle<{ collection: { id: string; handle: string } }>) {
    let published: string | undefined;
    return () => {
      const { collection } = handle.props;
      if (collection.id !== published) {
        published = collection.id;
        handle.queueTask(() => {
          getAnalytics()?.publish(AnalyticsEvent.COLLECTION_VIEWED, { collection });
        });
      }
      return null;
    };
  },
);

export const SearchView = clientEntry(
  import.meta.url,
  function SearchView(handle: Handle<{ searchTerm: string; searchResults?: { total: number } }>) {
    let published: string | undefined;
    return () => {
      const { searchResults, searchTerm } = handle.props;
      if (searchTerm && searchTerm !== published) {
        published = searchTerm;
        handle.queueTask(() => {
          getAnalytics()?.publish(AnalyticsEvent.SEARCH_VIEWED, { searchTerm, searchResults });
        });
      }
      return null;
    };
  },
);
