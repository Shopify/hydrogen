import type {Collection, Product} from '@shopify/hydrogen/storefront-api-types';
import {useFetcher} from '@remix-run/react';
import {useEffect, useState} from 'react';

import {getImageLoadingPriority} from '~/lib/const';
import {Button, Grid, ProductCard, Link} from '~/components';

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
    if (!endCursor) return;
    const url = new URL(window.location.href);
    url.searchParams.set('cursor', endCursor);
    fetcher.load(url.pathname + url.search);
  }

  useEffect(() => {
    if (!fetcher.data) return;

    const {products, collection} = fetcher.data;
    const pageProducts = collection?.products || products;

    if (!pageProducts) return;

    setProducts((prev: Product[]) => [...prev, ...pageProducts.nodes]);
    setNextPage(products.pageInfo.hasNextPage);
    setEndCursor(products.pageInfo.endCursor);
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
