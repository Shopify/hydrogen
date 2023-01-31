import {useEffect} from 'react';
import {useFetcher} from '@remix-run/react';
import type {Collection, Product} from '@shopify/hydrogen/storefront-api-types';
import {FeaturedCollections} from './FeaturedCollections';
import {ProductSwimlane} from './ProductSwimlane';
import {usePrefixPathWithLocale} from '~/lib/utils';

export interface FeaturedData {
  featuredCollections: Collection[];
  featuredProducts: Product[];
}

export function FeaturedSection() {
  const {load, data} = useFetcher();
  const path = usePrefixPathWithLocale('/featured-products');

  useEffect(() => {
    load(path);
  }, [load, path]);

  if (!data) return null;

  const {featuredCollections, featuredProducts} = data as FeaturedData;

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
