import type {
  CollectionConnection,
  ProductConnection,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { Button } from "./Button";
import { FeaturedCollections } from "./FeaturedCollections";
import { ProductSwimlane } from "./ProductSwimlane";
import { PageHeader, Text } from "./Text";

interface FeaturedData {
  featuredCollections: CollectionConnection;
  featuredProducts: ProductConnection;
}

export function NotFound({
  type = "page",
  featuredData,
}: {
  type?: string;
  featuredData?: FeaturedData;
}) {
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
      {featuredData && <FeaturedSection {...featuredData} />}
    </>
  );
}

function FeaturedSection({
  featuredCollections,
  featuredProducts,
}: FeaturedData) {
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
