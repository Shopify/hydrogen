import {createContext, type ReactNode, useContext, useEffect} from 'react';
import {useFetcher} from '@remix-run/react';
import type {CartReturn} from '@shopify/hydrogen';

const CartContext = createContext<CartReturn | null>(null);

export function CartProvider({children}: {children: ReactNode}) {
  const fetcher = useFetcher<CartReturn | null>();

  useEffect(() => {
    if (fetcher.data || fetcher.state === 'loading') return;

    fetcher.load('/cart');
  }, [fetcher]);

  return (
    <CartContext.Provider value={fetcher.data ?? null}>
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  return useContext(CartContext);
}
