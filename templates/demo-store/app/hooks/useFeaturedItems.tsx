import {useEffect} from 'react';
import {useFetcher} from '@remix-run/react';

import {usePrefixPathWithLocale} from '~/lib/utils';
import type {FeaturedItemsQuery} from 'storefrontapi.generated';

export function useFeaturedItems(
  {
    productsCount,
    collectionsCount,
  }: {
    productsCount: number;
    collectionsCount: number;
  } = {productsCount: 12, collectionsCount: 3},
) {
  const {load, data} = useFetcher<Awaited<FeaturedItemsQuery>>();
  const path = usePrefixPathWithLocale(
    `/featured-items?productsCount=${productsCount}&collectionsCount=${collectionsCount}`,
  );

  useEffect(() => {
    load(path);
  }, [load, path]);

  return data;
}
