import {describe, it, expect} from 'vitest';
import {cartGetDefault} from './cartGetDefault';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import type {CustomerAccount} from '../../customer/types';

describe('cartGetDefault', () => {
  it('should return a default cart get implementation', async () => {
    const cartGet = cartGetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartGet();

    expect(result).toHaveProperty('id', CART_ID);
  });

  it('should return an empty object when no cart id found', async () => {
    const cartGet = cartGetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => undefined,
    });

    const result = await cartGet();

    expect(result).toStrictEqual(null);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartGet = cartGetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartGet();

    expect(result).toHaveProperty('id', CART_ID);

    // @ts-expect-error
    expect(result.query).toContain(cartFragment);
  });

  it('should return a cartId passed in', async () => {
    const cartGet = cartGetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartGet({cartId: 'gid://shopify/Cart/c1-456'});

    expect(result).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  describe('run with customerAccount option', () => {
    it('should add logged_in search param to checkout link if customer is logged in', async () => {
      const cartGet = cartGetDefault({
        storefront: mockCreateStorefrontClient(),
        customerAccount: {
          isLoggedIn: () => Promise.resolve(true),
        } as CustomerAccount,
        getCartId: () => CART_ID,
      });

      const result = await cartGet();
      expect(result?.checkoutUrl).toContain('logged_in=true');
    });

    it('should NOT add logged_in search param to checkout link if customer is NOT logged in', async () => {
      const cartGet = cartGetDefault({
        storefront: mockCreateStorefrontClient(),
        customerAccount: {
          isLoggedIn: () => Promise.resolve(false),
        } as CustomerAccount,
        getCartId: () => CART_ID,
      });

      const result = await cartGet();
      expect(result?.checkoutUrl).not.toContain('logged_in=true');
    });
  });
});
