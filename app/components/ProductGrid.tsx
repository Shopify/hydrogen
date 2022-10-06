import { Button, Grid, ProductCard, LinkI18n } from "~/components";
import { getImageLoadingPriority } from "~/lib/const";
import type { Collection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { useSearchParams, useTransition } from "@remix-run/react";

export function ProductGrid({
  collection,
}: {
  url: string;
  collection: Collection;
}) {
  const transition = useTransition();
  const [searchParams] = useSearchParams();

  if (!collection?.products?.nodes) {
    return (
      <>
        <p>No products found on this collection</p>
        <LinkI18n to="/products">
          <p className="underline">Browse catalog</p>
        </LinkI18n>
      </>
    );
  }

  /* TODO: 
    - Load More -> Passes pages in location state via Link component
    - Infinite Scroll -> Opt-in to trigger load more when in view
    - Optional consideration: Virtualization if very long list (need to consider impact of scroll position, etc.)

    - product grid prepends location state products if found
    -- if found, never render a previous page link (because you'll already have it since page 1)
*/

  const { hasNextPage, hasPreviousPage, startCursor, endCursor } =
    collection?.products?.pageInfo;

  const products = collection?.products?.nodes;

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
            prefetch="intent"
          >
            {transition.state !== "idle" ? "Loading..." : "Load more products"}
          </Button>
        </div>
      )}
    </>
  );
}
