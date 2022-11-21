import clsx from 'clsx';
import {useEffect, useId} from 'react';
import {useFetcher} from '@remix-run/react';
import {Heading, ProductCard, Skeleton, Text} from '~/components';
import type {
  Product,
  ProductSortKeys,
} from '@shopify/hydrogen-react/storefront-api-types';

interface FeaturedProductsProps {
  count: number;
  heading: string;
  layout?: 'drawer' | 'page';
  onClose?: () => void;
  query?: string;
  reverse?: boolean;
  sortKey: ProductSortKeys;
}

export function FeaturedProducts({
  count = 4,
  heading = 'Shop Best Sellers',
  layout = 'drawer',
  onClose,
  query,
  reverse,
  sortKey = 'BEST_SELLING',
}: FeaturedProductsProps) {
  const {load, data} = useFetcher();

  useEffect(() => {
    const queryString = Object.entries({count, sortKey, query, reverse})
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    // @todo add reverse and query params
    load(`/api/products?${encodeURIComponent(queryString)}`);
  }, [load, count, sortKey, query, reverse]);

  return (
    <>
      <Heading format size="copy" className="t-4">
        {heading}
      </Heading>
      <div
        className={clsx([
          `grid grid-cols-2 gap-x-6 gap-y-8`,
          layout === 'page' ? 'md:grid-cols-4 sm:grid-col-4' : '',
        ])}
      >
        <FeatureProductsContent
          count={count}
          onClick={onClose}
          products={data?.products as Product[]}
        />
      </div>
    </>
  );
}

function FeatureProductsContent({
  count = 4,
  onClick,
  products,
}: {
  count: FeaturedProductsProps['count'];
  products: Product[] | undefined;
  onClick?: () => void;
}) {
  const id = useId();

  if (!products) {
    return (
      <>
        {[...new Array(count)].map((_, i) => (
          <div key={`${id + i}`} className="grid gap-2">
            <Skeleton className="aspect-[3/4]" />
            <Skeleton className="w-32 h-4" />
          </div>
        ))}
      </>
    );
  }

  if (products?.length === 0) {
    return <Text format>No products found.</Text>;
  }

  return (
    <>
      {products.map((product) => (
        <ProductCard
          product={product as Product}
          key={product.id}
          onClick={onClick}
        />
      ))}
    </>
  );
}
