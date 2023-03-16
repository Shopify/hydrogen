import {useMemo} from 'react';
import {useMatches, useFetcher} from '@remix-run/react';

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
