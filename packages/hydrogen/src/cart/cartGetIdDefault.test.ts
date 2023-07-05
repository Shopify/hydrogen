import {describe, expect, expectTypeOf, it} from 'vitest';
import {mockHeaders} from './cart-test-helper';
import {cartGetIdDefault} from './cartGetIdDefault';

describe('cartGetIdDefault', () => {
  it('returns undefined when no cart cookie found', () => {
    const getCartId = cartGetIdDefault(mockHeaders());

    expectTypeOf(getCartId).toEqualTypeOf<() => string | undefined>;
    expect(getCartId()).toBeUndefined();
  });

  it('returns a string when cart cookie is found', () => {
    const getCartId = cartGetIdDefault(mockHeaders('c1-123'));

    expect(getCartId()).toBe('gid://shopify/Cart/c1-123');
  });
});
