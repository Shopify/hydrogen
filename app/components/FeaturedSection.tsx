import {useEffect} from 'react';
import {useFetcher} from '@remix-run/react';
import type {
  Collection,
  Product,
} from '@shopify/hydrogen-react/storefront-api-types';
import {FeaturedCollections} from './FeaturedCollections';
import {ProductSwimlane} from './ProductSwimlane';
import {usePrefixPathWithLocale} from '~/lib/utils';

export interface FeaturedData {
  featuredCollections: Collection[];
  featuredProducts: Product[];
}

export function FeaturedSection() {
  const featuredProductsFetcher = useFetcher();
  const path = usePrefixPathWithLocale('/featured-products');

  useEffect(() => {
    featuredProductsFetcher.load(path);
  }, [path]);

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
