import {useMemo} from 'react';
import {useMatches, useFetcher} from '@remix-run/react';

import type {
  Cart as CartType,
  CartLineInput,
} from '@shopify/hydrogen/storefront-api-types';
import {CartAction} from './types';

interface Props {
  children: React.ReactNode;
  lines: CartLineInput[];
  analytics?: unknown;
  action: CartAction;
}

export function CartForm({children, lines, analytics}: Props) {
  const fetcher = useFetcher();

  return (
    <fetcher.Form action="/cart" method="post">
      <input type="hidden" name="analytics" value={JSON.stringify(analytics)} />
      <input type="hidden" name="cartAction" value="ADD_TO_CART" />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      {children}
    </fetcher.Form>
  );
}
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

  return data.cart;
}
