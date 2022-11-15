import {renderHook} from '@testing-library/react';
import {CartLine} from './storefront-api-types.js';
import {useCartLine, CartLineProvider} from './CartLineProvider.js';
import {getCartLineMock} from './CartProvider.test.helpers.js';

it('provides a hook to access cart line data', () => {
  const cartLine = getCartLineMock();

  const {result} = renderHook(() => useCartLine(), {
    wrapper: ({children}) => (
      <CartLineProvider line={cartLine as CartLine}>
        {children}
      </CartLineProvider>
    ),
  });

  expect(result.current).toEqual(cartLine);
});
