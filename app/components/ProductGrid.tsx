import { Link } from "~/components";
import type { ProductConnection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { ProductGridPaginated } from "~/components/ProductGridPaginated";
import { ProductGridInfinite } from "~/components/ProductGridInfinite";

export function ProductGrid({
  paginated = true,
  products,
  ...props
}: {
  paginated?: boolean;
  products: ProductConnection;
  [key: string]: any;
}) {
  if (!products?.nodes) {
    return (
      <>
        <p>No products found on this collection</p>
        <Link to="/products">
          <p className="underline">Browse catalog</p>
        </Link>
      </>
    );
  }

  /* TODO:
      - Optional consideration: Virtualization if very long list (need to consider impact of scroll position, etc.)
    */

  return paginated ? (
    <ProductGridPaginated {...props} products={products} />
  ) : (
    <ProductGridInfinite {...props} products={products} />
  );
}
