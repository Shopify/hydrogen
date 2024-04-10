import {useContext, createContext, type ReactNode} from 'react';
import {
  ComponentizableCartLine,
  type CartLine,
} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';

type CartLinePartialDeep = PartialDeep<
  CartLine | ComponentizableCartLine,
  {recurseIntoArrays: true}
>;

export const CartLineContext = createContext<CartLinePartialDeep | null>(null);

/**
 * The `useCartLine` hook provides access to the [CartLine object](https://shopify.dev/api/storefront/2024-04/objects/cartline) from the Storefront API. It must be a descendent of a `CartProvider` component.
 */
export function useCartLine(): CartLinePartialDeep {
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
  line: CartLinePartialDeep;
};

/**
 * The `CartLineProvider` component creates a context for using a cart line.
 */
export function CartLineProvider({
  children,
  line,
}: CartLineProviderProps): JSX.Element {
  return (
    <CartLineContext.Provider value={line}>{children}</CartLineContext.Provider>
  );
}
