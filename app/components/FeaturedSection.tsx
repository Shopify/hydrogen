import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import type {
  CollectionConnection,
  ProductConnection,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { FeaturedCollections } from "./FeaturedCollections";
import { ProductSwimlane } from "./ProductSwimlane";

interface FeaturedData {
  featuredCollections: CollectionConnection;
  featuredProducts: ProductConnection;
}

export function FeaturedSection() {
  const featuredProductsFetcher = useFetcher();

  useEffect(() => {
    featuredProductsFetcher.load("/featured-products");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!featuredProductsFetcher.data) return null;

  const { featuredCollections, featuredProducts } =
    featuredProductsFetcher.data as FeaturedData;

  return (
    <>
      {featuredCollections.nodes.length < 2 && (
        <FeaturedCollections
          title="Popular Collections"
          data={featuredCollections.nodes}
        />
      )}
      <ProductSwimlane data={featuredProducts.nodes} />
    </>
  );
}
