import {useMemo} from 'react';
import {useMatches, useFetcher, useFetchers} from '@remix-run/react';

import type {
  Cart as CartType,
  CartLineInput,
} from '@shopify/hydrogen/storefront-api-types';
import {CartAction} from './types';

export function useMatchesData(id: string) {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id],
  );

  return route?.data;
}

export function useCart(): CartType | undefined {
  const data = useMatchesData('root');

  return data?.cart;
}

export function useFormFetcher(id: string) {
  const fetchers = useFetchers();
  const data: Record<string, unknown> = {};

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (formData && formData.get('form-id') === id) {
      return fetcher;
    }
  }
  return null;
}
