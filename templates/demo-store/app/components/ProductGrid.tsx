import {Button, Grid, ProductCard, Link} from '~/components';
import {getImageLoadingPriority} from '~/lib/const';
import type {
  Collection,
  Product,
} from '@shopify/storefront-kit-react/storefront-api-types';
import {useFetcher} from '@remix-run/react';
import {useEffect, useState} from 'react';

export function ProductGrid({
  url,
  collection,
  ...props
}: {
  url: string;
  collection: Collection;
}) {
  const [initialProducts, setInitialProducts] = useState(
    collection?.products?.nodes || [],
  );

  const [nextPage, setNextPage] = useState(
    collection?.products?.pageInfo?.hasNextPage,
  );
  const [endCursor, setEndCursor] = useState(
    collection?.products?.pageInfo?.endCursor,
  );
  const [products, setProducts] = useState(initialProducts);

  // props have changes, reset component state
  const productProps = collection?.products?.nodes || [];
  if (initialProducts !== productProps) {
    setInitialProducts(productProps);
    setProducts(productProps);
  }

  const fetcher = useFetcher();

  function fetchMoreProducts() {
    fetcher.load(`${url}?index&cursor=${endCursor}`);
  }

  useEffect(() => {
    if (!fetcher.data) return;

    const {collection} = fetcher.data;

    setProducts((prev: Product[]) => [...prev, ...collection.products.nodes]);
    setNextPage(collection.products.pageInfo.hasNextPage);
    setEndCursor(collection.products.pageInfo.endCursor);
  }, [fetcher.data]);

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
      <Grid layout="products" {...props}>
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            loading={getImageLoadingPriority(i)}
          />
        ))}
      </Grid>

      {nextPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            disabled={fetcher.state !== 'idle'}
            variant="secondary"
            onClick={fetchMoreProducts}
            width="full"
            prefetch="intent"
          >
            {fetcher.state !== 'idle' ? 'Loading...' : 'Load more products'}
          </Button>
        </div>
      )}
    </>
  );
}
