import { useFetcher } from "@remix-run/react";
import type {
  CollectionConnection,
  ProductConnection,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { useEffect } from "react";
import { Button } from "./Button";
import { FeaturedCollections } from "./FeaturedCollections";
import { ProductSwimlane } from "./ProductSwimlane";
import { PageHeader, Text } from "./Text";

export function NotFound({ type = "page" }: { type?: string }) {
  const heading = `We’ve lost this ${type}`;
  const description = `We couldn’t find the ${type} you’re looking for. Try checking the URL or heading back to the home page.`;

  return (
    <>
      <PageHeader heading={heading}>
        <Text width="narrow" as="p">
          {description}
        </Text>
        <Button width="auto" variant="secondary" to={"/"}>
          Take me to the home page
        </Button>
      </PageHeader>
      <FeaturedSection />
    </>
  );
}

interface FeaturedData {
  featuredCollections: CollectionConnection;
  featuredProducts: ProductConnection;
}

function FeaturedSection() {
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
