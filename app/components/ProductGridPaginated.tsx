import { Button, Grid, ProductCard } from "~/components";
import { getImageLoadingPriority } from "~/lib/const";
import type { ProductConnection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { useTransition } from "@remix-run/react";

export function ProductGridPaginated({
  products: initialProducts,
}: {
  products: ProductConnection;
}) {
  const transition = useTransition();

  /* TODO:
    - Load More -> Passes pages in location state via Link component

    - product grid prepends location state products if found
    -- if found, never render a previous page link (because you'll already have it since page 1)
*/

  const { hasNextPage, hasPreviousPage, startCursor, endCursor } =
    initialProducts?.pageInfo;

  const products = initialProducts?.nodes;

  return (
    <>
      {hasPreviousPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={`.?cursor=${startCursor}&direction=previous`}
            disabled={transition.state !== "idle"}
            variant="secondary"
            width="full"
            prefetch="intent"
          >
            {transition.state !== "idle"
              ? "Loading..."
              : "Load previous products"}
          </Button>
        </div>
      )}

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
            to={`.?cursor=${endCursor}&direction=next`}
            disabled={transition.state !== "idle"}
            variant="secondary"
            width="full"
            preventScrollReset
            prefetch="intent"
          >
            {transition.state !== "idle" ? "Loading..." : "Load more products"}
          </Button>
        </div>
      )}
    </>
  );
}
