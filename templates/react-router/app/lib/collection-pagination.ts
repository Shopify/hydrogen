type CursorPageInfo = {
  startCursor: string | null;
  endCursor: string | null;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type ProductWindow<Product extends { id: string }> = {
  products: Product[];
  pageInfo: CursorPageInfo;
};

export function mergeProductWindow<Product extends { id: string }>(
  current: ProductWindow<Product>,
  incoming: ProductWindow<Product>,
  direction: "next" | "previous",
): { window: ProductWindow<Product>; firstAddedProductId: string | null } {
  const seen = new Set(current.products.map((product) => product.id));
  const addedProducts: Product[] = [];

  for (const product of incoming.products) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    addedProducts.push(product);
  }

  return {
    window: {
      products:
        direction === "previous"
          ? [...addedProducts, ...current.products]
          : [...current.products, ...addedProducts],
      pageInfo:
        direction === "previous"
          ? {
              ...current.pageInfo,
              startCursor: incoming.pageInfo.startCursor,
              hasPreviousPage: incoming.pageInfo.hasPreviousPage,
            }
          : {
              ...current.pageInfo,
              endCursor: incoming.pageInfo.endCursor,
              hasNextPage: incoming.pageInfo.hasNextPage,
            },
    },
    firstAddedProductId: addedProducts[0]?.id ?? null,
  };
}
