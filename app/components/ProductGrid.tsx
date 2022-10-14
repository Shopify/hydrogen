import { LinkI18n } from "~/components";
import type { ProductConnection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { ProductGridPaginated } from './ProductGridPaginated';
import { ProductGridInfinite } from "./ProductGridInfinite";

export function ProductGrid({
  paginated = false,
  products,
  ...props
}: {
  paginated?: boolean
  products: ProductConnection;
  [key: string]: any;
}) {
  if (!products?.nodes) {
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
      - Optional consideration: Virtualization if very long list (need to consider impact of scroll position, etc.)
    */

  return (
    paginated
      ? <ProductGridPaginated
          {...props}
          products={products}
        />
      : <ProductGridInfinite
          {...props}
          products={products}
        />
  );
}
