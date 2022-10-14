import { Button, Grid, ProductCard } from "~/components";
import { getImageLoadingPriority } from "~/lib/const";
import type { ProductConnection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { useTransition, useLocation } from "@remix-run/react";

export function ProductGridPaginated({
  products: initialProducts,
}: {
  products: ProductConnection;
}) {
  const transition = useTransition();

  const { hasNextPage, hasPreviousPage, startCursor, endCursor } =
    initialProducts?.pageInfo;

  const products = initialProducts?.nodes;
  const location = useLocation();
  const state = location.state as any;
  const search = new URLSearchParams(location.search);
  const isPrevious = search.get("direction") === "previous";

  let stateStartCursor =
    state?.startCursor === undefined ? startCursor : state.startCursor;

  let stateEndCursor =
    state?.endCursor === undefined ? endCursor : state.endCursor;

  let currentlyShownProducts = products;

  if (state?.products) {
    if (isPrevious) {
      currentlyShownProducts = [...products, ...state.products];
      stateStartCursor = startCursor;
    } else {
      currentlyShownProducts = [...state?.products, ...products];
      stateEndCursor = endCursor;
    }
  }

  let previousPageExists =
    state?.hasPreviousPage === undefined
      ? hasPreviousPage
      : state.hasPreviousPage;
  let nextPageExists =
    state?.hasNextPage === undefined ? hasNextPage : state.hasNextPage;

  return (
    <>
      {previousPageExists && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={`?cursor=${stateStartCursor}&direction=previous`}
            disabled={transition.state !== "idle"}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              endCursor: stateEndCursor,
              startCursor: stateStartCursor,
              hasNextPage: nextPageExists,
              products: currentlyShownProducts,
            }}
          >
            {transition.state === "loading"
              ? "Loading..."
              : "Load previous products"}
          </Button>
        </div>
      )}

      <Grid layout="products">
        {currentlyShownProducts.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            loading={getImageLoadingPriority(i)}
          />
        ))}
      </Grid>

      {nextPageExists && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={`.?cursor=${stateEndCursor}&direction=next`}
            disabled={transition.state !== "idle"}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              endCursor: stateEndCursor,
              startCursor: stateStartCursor,
              hasPreviousPage: previousPageExists,
              products: currentlyShownProducts,
            }}
          >
            {transition.state !== "idle" ? "Loading..." : "Load more products"}
          </Button>
        </div>
      )}
    </>
  );
}
