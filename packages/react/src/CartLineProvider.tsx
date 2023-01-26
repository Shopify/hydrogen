import {useContext, createContext, type ReactNode} from 'react';
import {CartLine} from './storefront-api-types.js';

export const CartLineContext = createContext<CartLine | null>(null);

/**
 * The `useCartLine` hook provides access to the cart line object. It must be a descendent of a `CartProvider` component.
 */
export function useCartLine() {
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
