'use client';

import {useEffect} from 'react';
import {useCart} from 'components/cart/cart-context';
import {useAnalyticsBus} from './analytics-provider';
import type {Cart, CartItem} from 'lib/shopify/types';
import type {AnalyticsCart, AnalyticsCartLine} from '@shopify/hydrogen-temp';

/**
 * Adapts the commerce template's flat Cart shape into the AnalyticsCart
 * connection format expected by the analytics bus's updateCart().
 *
 * The commerce template reshapes Shopify's GraphQL response into a flat
 * CartItem[] array (via removeEdgesAndNodes). The bus expects the original
 * connection structure with { nodes: [...] }. This function bridges that gap.
 */
function toAnalyticsCart(cart: Cart | undefined): AnalyticsCart | null {
  if (!cart?.id || !cart?.updatedAt) return null;

  const analyticsLines: AnalyticsCartLine[] = cart.lines
    .filter((line): line is CartItem & {id: string} => !!line.id)
    .map((line) => ({
      id: line.id,
      quantity: line.quantity,
      merchandise: {
        id: line.merchandise.id,
        title: line.merchandise.title,
        price: {
          amount: line.merchandise.price.amount,
          currencyCode: line.merchandise.price.currencyCode,
        },
        sku: line.merchandise.sku ?? null,
        product: {
          id: line.merchandise.product.id,
          title: line.merchandise.product.title,
          vendor: line.merchandise.product.vendor,
          handle: line.merchandise.product.handle,
        },
      },
    }));

  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    lines: {nodes: analyticsLines},
  };
}

/**
 * Observes cart state changes and feeds them to the analytics bus.
 *
 * Must be rendered as a child of both AnalyticsProvider and CartProvider.
 * Uses the server-confirmed cart (not optimistic state) for analytics —
 * optimistic updates don't change `updatedAt`, so the bus's cart-tracker
 * correctly deduplicates them via its updatedAt equality check.
 */
export function CartAnalyticsTracker() {
  const {cart} = useCart();
  const {bus} = useAnalyticsBus();

  useEffect(() => {
    const analyticsCart = toAnalyticsCart(cart);
    bus.updateCart(analyticsCart);
  }, [cart, bus]);

  return null;
}
