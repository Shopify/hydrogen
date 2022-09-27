import { Button, Grid, ProductCard } from "~/components";
import { getImageLoadingPriority } from "~/lib/const";
import type { Collection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { Link } from "@remix-run/react";

export function ProductGrid({
  url,
  collection,
}: {
  url: string;
  collection: Collection;
}) {
  const initialProducts = collection?.products?.nodes || [];
  const { hasNextPage, endCursor } = collection?.products?.pageInfo ?? {};
  const products = initialProducts;
  const haveProducts = initialProducts.length > 0;

  if (!haveProducts) {
    return (
      <>
        <p>No products found on this collection</p>
        <Link to="/products">
          <p className="underline">Browse catalog</p>
        </Link>
      </>
    );
  }

  return (
    <>
      <Grid layout="products">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            loading={getImageLoadingPriority(i)}
          />
        ))}
      </Grid>

      {hasNextPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            variant="secondary"
            to={`${url}?cursor=${endCursor}`}
            width="full"
          >
            Load more products
          </Button>
        </div>
      )}
    </>
  );
}
