import {useEffect} from 'react';
import {useFetcher} from '@remix-run/react';

import {usePrefixPathWithLocale} from '~/lib/utils';
import type {FeaturedItemsQuery} from 'storefrontapi.generated';

export function useFeaturedItems() {
  const {load, data} = useFetcher<Awaited<FeaturedItemsQuery>>();
  const path = usePrefixPathWithLocale('/featured-products');

  useEffect(() => {
    load(path);
  }, [load, path]);

  return data;
}
