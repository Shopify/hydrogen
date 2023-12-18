import {describe, expect, expectTypeOf, it} from 'vitest';
import {cartSetIdDefault} from './cartSetIdDefault';

describe('cartSetIdDefault', () => {
  it('sets a Set-Cookie in the provided header', () => {
    const setCartId = cartSetIdDefault();
    const headers = setCartId('gid://shopify/Cart/c1-123');

    expectTypeOf(setCartId).toEqualTypeOf<(cartId: string) => Headers>;
    expect(headers.get('Set-Cookie')).toBe('cart=c1-123; Path=/');
  });

  it('sets a Set-Cookie in the provided header with cookie options', () => {
    const setCartId = cartSetIdDefault({maxage: 1000});
    const headers = setCartId('gid://shopify/Cart/c1-123');

    expectTypeOf(setCartId).toEqualTypeOf<(cartId: string) => Headers>;
    expect(headers.get('Set-Cookie')).toBe('cart=c1-123; Max-Age=1000; Path=/');
  });
});
