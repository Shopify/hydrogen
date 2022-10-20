import {useEffect} from 'react';
import {useFetcher} from '@remix-run/react';
import type {
  Collection,
  Product,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {FeaturedCollections} from './FeaturedCollections';
import {ProductSwimlane} from './ProductSwimlane';
import {prefixPathWithLocale} from '~/lib/utils';

export interface FeaturedData {
  featuredCollections: Collection[];
  featuredProducts: Product[];
}

export function FeaturedSection() {
  const featuredProductsFetcher = useFetcher();
  const path = prefixPathWithLocale('/featured-products');

  useEffect(() => {
    featuredProductsFetcher.load(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!featuredProductsFetcher.data) return null;

  const {featuredCollections, featuredProducts} =
    featuredProductsFetcher.data as FeaturedData;

  return (
    <>
      {featuredCollections.length < 2 && (
        <FeaturedCollections
          title="Popular Collections"
          collections={featuredCollections}
        />
      )}
      <ProductSwimlane products={featuredProducts} />
    </>
  );
}
