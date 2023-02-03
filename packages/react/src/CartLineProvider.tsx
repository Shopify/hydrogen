import {useContext, createContext, type ReactNode} from 'react';
import type {CartLine} from './storefront-api-types.js';

export const CartLineContext = createContext<CartLine | null>(null);

/**
 * The `useCartLine` hook provides access to the [CartLine object](https://shopify.dev/api/storefront/unstable/objects/cartline) from the Storefront API. It must be a descendent of a `CartProvider` component.
 */
export function useCartLine(): CartLine {
  const context = useContext(CartLineContext);

  if (context == null) {
    throw new Error('Expected a cart line context but none was found');
  }

  return context;
}

type CartLineProviderProps = {
  /** Any `ReactNode` elements. */
  children: ReactNode;
  /** A cart line object. */
  line: CartLine;
};

/**
 * The `CartLineProvider` component creates a context for using a cart line.
 */
export function CartLineProvider({children, line}: CartLineProviderProps) {
  return (
    <CartLineContext.Provider value={line}>{children}</CartLineContext.Provider>
  );
}
