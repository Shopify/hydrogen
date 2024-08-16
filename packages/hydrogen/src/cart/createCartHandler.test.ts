import {describe, expect, expectTypeOf, it} from 'vitest';
import {
  HydrogenCart,
  HydrogenCartCustom,
  createCartHandler,
} from './createCartHandler';
import {
  mockCreateCustomerAccountClient,
  mockCreateStorefrontClient,
  mockHeaders,
} from './cart-test-helper';

type MockCarthandler = {
  cartId?: string;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
  customMethods?: Record<string, Function>;
};

function getCartHandler(options: MockCarthandler = {}) {
  const {cartId, ...rest} = options;
  return createCartHandler({
    storefront: mockCreateStorefrontClient(),
    customerAccount: mockCreateCustomerAccountClient(),
    getCartId: () =>
      options.cartId ? `gid://shopify/Cart/${options.cartId}` : undefined,
    setCartId: () => new Headers(),
    ...rest,
  });
}

describe('createCartHandler', () => {
  it('returns a cart handler instance', () => {
    const cart = getCartHandler();

    expectTypeOf(cart).toEqualTypeOf<HydrogenCart>;
    expect(Object.keys(cart)).toHaveLength(15);
    expect(cart).toHaveProperty('get');
    expect(cart).toHaveProperty('getCartId');
    expect(cart).toHaveProperty('setCartId');
    expect(cart).toHaveProperty('create');
    expect(cart).toHaveProperty('addLines');
    expect(cart).toHaveProperty('updateLines');
    expect(cart).toHaveProperty('removeLines');
    expect(cart).toHaveProperty('updateDiscountCodes');
    expect(cart).toHaveProperty('updateGiftCardCodes');
    expect(cart).toHaveProperty('updateBuyerIdentity');
    expect(cart).toHaveProperty('updateNote');
    expect(cart).toHaveProperty('updateSelectedDeliveryOption');
    expect(cart).toHaveProperty('updateAttributes');
    expect(cart).toHaveProperty('setMetafields');
    expect(cart).toHaveProperty('deleteMetafield');
  });

  it('can add custom methods', () => {
    const cart = createCartHandler({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => undefined,
      setCartId: () => new Headers(),
      customMethods: {
        foo() {
          return 'bar';
        },
      },
    });

    expectTypeOf(cart).toEqualTypeOf<HydrogenCartCustom<{foo: () => 'bar'}>>;
    expect(Object.keys(cart)).toHaveLength(16);
    expect(cart.foo()).toBe('bar');
  });

  it('can override default methods', async () => {
    const cart = getCartHandler({
      customMethods: {
        get() {
          return Promise.resolve('bar');
        },
      },
    });

    expectTypeOf(cart).toEqualTypeOf<HydrogenCart>;
    expect(Object.keys(cart)).toHaveLength(15);
    expect(await cart.get()).toBe('bar');
  });

  it('cartQueryFragment can override default get query fragment', async () => {
    const cartQueryFragment = 'cartQueryFragmentOverride';
    const cart = getCartHandler({
      cartId: 'c1-123',
      cartQueryFragment,
    });

    const result = await cart.get();

    // @ts-expect-error
    expect(result.query).toContain(cartQueryFragment);
  });

  it('cartMutateFragment can override default get query fragment', async () => {
    const cartMutateFragment = 'cartMutateFragmentOverride';
    const cart = getCartHandler({
      cartId: 'c1-123',
      cartMutateFragment,
    });

    const result1 = await cart.create({});
    expect(result1.userErrors?.[0]).toContain(cartMutateFragment);

    const result2 = await cart.addLines([]);
    expect(result2.userErrors?.[0]).toContain(cartMutateFragment);

    const result3 = await cart.updateLines([]);
    expect(result3.userErrors?.[0]).toContain(cartMutateFragment);

    const result4 = await cart.removeLines([]);
    expect(result4.userErrors?.[0]).toContain(cartMutateFragment);

    const result5 = await cart.updateDiscountCodes([]);
    expect(result5.userErrors?.[0]).toContain(cartMutateFragment);

    const result6 = await cart.updateBuyerIdentity({});
    expect(result6.userErrors?.[0]).toContain(cartMutateFragment);

    const result7 = await cart.updateNote('');
    expect(result7.userErrors?.[0]).toContain(cartMutateFragment);

    const result8 = await cart.updateSelectedDeliveryOption([
      {
        deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
        deliveryOptionHandle: 'Postal Service',
      },
    ]);
    expect(result8.userErrors?.[0]).toContain(cartMutateFragment);

    const result9 = await cart.updateAttributes([]);
    expect(result9.userErrors?.[0]).toContain(cartMutateFragment);

    const result10 = await cart.setMetafields([]);
    expect(result10.userErrors?.[0]).not.toContain(cartMutateFragment);

    const result11 = await cart.deleteMetafield('some.key');
    expect(result11.userErrors?.[0]).not.toContain(cartMutateFragment);

    const result12 = await cart.updateGiftCardCodes([]);
    expect(result12.userErrors?.[0]).toContain(cartMutateFragment);
  });

  it('function get has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.get();

    expect(result).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function get can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.get({cartId: 'gid://shopify/Cart/c1-456'});

    expect(result).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function create has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.create({});

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function addLines has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.addLines([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function addLines can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.addLines([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function addLines creates a cart if cart id is not found', async () => {
    const cart = getCartHandler();

    const result = await cart.addLines([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateLines has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateLines([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateLines can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateLines([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function removeLines has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.removeLines([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function removeLines can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.removeLines([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateDiscountCodes has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateDiscountCodes([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateDiscountCodes can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateDiscountCodes([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateDiscountCodes creates a cart if cart id is not found', async () => {
    const cart = getCartHandler();

    const result = await cart.updateDiscountCodes([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateGiftCardCodes has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateGiftCardCodes([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateGiftCardCodes can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateGiftCardCodes([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateGiftCardCodes creates a cart if cart id is not found', async () => {
    const cart = getCartHandler();

    const result = await cart.updateGiftCardCodes([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateBuyerIdentity has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateBuyerIdentity({});

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateBuyerIdentity can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateBuyerIdentity(
      {},
      {cartId: 'gid://shopify/Cart/c1-456'},
    );

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateBuyerIdentity creates a cart if cart id is not found', async () => {
    const cart = getCartHandler();

    const result = await cart.updateBuyerIdentity({});

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateNote has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateNote('');

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateNote can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateNote('', {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateNote creates a cart if cart id is not found', async () => {
    const cart = getCartHandler();

    const result = await cart.updateNote('');

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateSelectedDeliveryOption has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateSelectedDeliveryOption([
      {
        deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
        deliveryOptionHandle: 'Postal Service',
      },
    ]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateSelectedDeliveryOption can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateSelectedDeliveryOption(
      [
        {
          deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
          deliveryOptionHandle: 'Postal Service',
        },
      ],
      {cartId: 'gid://shopify/Cart/c1-456'},
    );

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateAttributes has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.updateAttributes([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateAttributes can provide overridable parameter', async () => {
    const cart = getCartHandler();

    const result = await cart.updateAttributes([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateAttributes creates a cart if cart id is not found', async () => {
    const cart = getCartHandler();

    const result = await cart.updateAttributes([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function setMetafields has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.setMetafields([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function setMetafields can provide overridable parameter', async () => {
    const cart = getCartHandler();

    const result = await cart.setMetafields([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function setMetafields creates a cart if cart id is not found', async () => {
    const cart = getCartHandler();

    const result = await cart.setMetafields([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function deleteMetafield has a working default implementation', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.deleteMetafield('some.key');

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function deleteMetafield can provide overridable parameter', async () => {
    const cart = getCartHandler({cartId: 'c1-123'});

    const result = await cart.deleteMetafield('some.key', {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('stores the cartId in memory when a new cart is created and returns that result if available', async () => {
    const cart = getCartHandler();

    await cart.addLines([
      {
        merchandiseId: '1',
        quantity: 1,
      },
    ]);

    expect(await cart.get()).toHaveProperty('id', 'c1-new-cart-id');
  });
});
