import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import {
  CartHandlerReturnBase,
  CartHandlerReturnCustom,
  createCartHandler_unstable,
} from './cart-handler';
import {CachingStrategy} from '../cache/strategies';
import type {ExecutionArgs} from 'graphql';
import {Storefront} from '../storefront';
import {CacheNone} from '../cache/strategies';

function storefrontQuery(
  query: string,
  payload?: {
    variables?: ExecutionArgs['variableValues'];
    cache?: CachingStrategy;
  },
) {
  return Promise.resolve({
    cart: {
      id: payload?.variables?.cartId,
      query,
    },
  });
}

function storefrontMutate(
  query: string,
  payload?: {
    variables?: ExecutionArgs['variableValues'];
  },
) {
  let cartId = payload?.variables?.cartId as string;
  let keyWrapper: string = 'error';
  if (/mutation CartCreate/.test(query)) {
    keyWrapper = 'cartCreate';
    cartId = 'c1-new-cart-id';
  } else if (/mutation CartLinesAdd/.test(query)) {
    keyWrapper = 'cartLinesAdd';
  } else if (/mutation CartLinesUpdate/.test(query)) {
    keyWrapper = 'cartLinesUpdate';
  } else if (/mutation CartLinesRemove/.test(query)) {
    keyWrapper = 'cartLinesRemove';
  } else if (/mutation cartDiscountCodesUpdate/.test(query)) {
    keyWrapper = 'cartDiscountCodesUpdate';
  } else if (/mutation cartBuyerIdentityUpdate/.test(query)) {
    keyWrapper = 'cartBuyerIdentityUpdate';
  } else if (/mutation cartNoteUpdate/.test(query)) {
    keyWrapper = 'cartNoteUpdate';
  } else if (/mutation cartSelectedDeliveryOptionsUpdate/.test(query)) {
    keyWrapper = 'cartSelectedDeliveryOptionsUpdate';
  } else if (/mutation cartAttributesUpdate/.test(query)) {
    keyWrapper = 'cartAttributesUpdate';
  } else if (/mutation cartMetafieldsSet/.test(query)) {
    keyWrapper = 'cartMetafieldsSet';
  } else if (/mutation cartMetafieldDelete/.test(query)) {
    keyWrapper = 'cartMetafieldDelete';
  }

  return Promise.resolve({
    [keyWrapper]: {
      cart: {
        id: cartId,
      },
      errors: [query],
    },
  });
}

function mockHeaders(cartId?: string) {
  return new Headers({
    Cookie: cartId ? `cart=${cartId}` : '',
  });
}

function mockCreateStorefrontClient() {
  return {
    query: storefrontQuery,
    mutate: storefrontMutate,
    CacheNone: CacheNone,
  } as Storefront;
}

describe('createCartHandler_unstable', () => {
  it('returns a cart handler instance', () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    expectTypeOf(cart).toEqualTypeOf<CartHandlerReturnBase>;
    expect(Object.keys(cart)).toHaveLength(15);
    expect(cart).toHaveProperty('getFormInput');
    expect(cart).toHaveProperty('get');
    expect(cart).toHaveProperty('getCartId');
    expect(cart).toHaveProperty('setCartId');
    expect(cart).toHaveProperty('create');
    expect(cart).toHaveProperty('addLines');
    expect(cart).toHaveProperty('updateLines');
    expect(cart).toHaveProperty('removeLines');
    expect(cart).toHaveProperty('updateDiscountCodes');
    expect(cart).toHaveProperty('updateBuyerIdentity');
    expect(cart).toHaveProperty('updateNote');
    expect(cart).toHaveProperty('updateSelectedDeliveryOption');
    expect(cart).toHaveProperty('updateAttributes');
    expect(cart).toHaveProperty('setMetafields');
    expect(cart).toHaveProperty('deleteMetafield');
  });

  it('can add custom methods', () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
      customMethods: {
        foo() {
          return 'bar';
        },
      },
    });

    expectTypeOf(cart).toEqualTypeOf<CartHandlerReturnCustom<{}>>;
    expect(Object.keys(cart)).toHaveLength(16);
    expect(cart.foo()).toBe('bar');
  });

  it('can override default methods', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
      customMethods: {
        get() {
          return Promise.resolve('bar');
        },
      },
    });

    expectTypeOf(cart).toEqualTypeOf<CartHandlerReturnBase>;
    expect(Object.keys(cart)).toHaveLength(15);
    expect(await cart.get()).toBe('bar');
  });

  it('function getCartId has a default implementation', () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    expect(cart.getCartId()).toBeUndefined();

    const cart2 = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    expect(cart2.getCartId()).toBe('gid://shopify/Cart/c1-123');
  });

  it('can override getCartId', () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
      getCartId: () => 'c1-abc',
    });

    expect(cart.getCartId()).toBe('c1-abc');
  });

  it('function setCartId has a default implementation', () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    const headers = mockHeaders();
    cart.setCartId('gid://shopify/Cart/c1-456', headers);

    expect(headers.get('Set-Cookie')).toBe('cart=c1-456');
  });

  it('can override setCartId', () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
      setCartId: (cartId, headers) => cartId,
    });

    expect(cart.setCartId).not.toBeUndefined();
    expectTypeOf(cart.setCartId).toEqualTypeOf<() => string>;
    expect(cart.setCartId('c1-123', mockHeaders())).toBe('c1-123');
  });

  it('cartQueryFragment can override default get query fragment', async () => {
    const cartQueryFragment = 'cartQueryFragmentOverride';
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
      cartQueryFragment,
    });

    const result = await cart.get();

    // @ts-expect-error
    expect(result.query).toContain(cartQueryFragment);
  });

  it('cartQueryFragment can override default get query fragment', async () => {
    const cartMutateFragment = 'cartMutateFragmentOverride';
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
      cartMutateFragment,
    });

    const result1 = await cart.create({});
    expect(result1.errors?.[0]).toContain(cartMutateFragment);

    const result2 = await cart.addLines([]);
    expect(result2.errors?.[0]).toContain(cartMutateFragment);

    const result3 = await cart.updateLines([]);
    expect(result3.errors?.[0]).toContain(cartMutateFragment);

    const result4 = await cart.removeLines([]);
    expect(result4.errors?.[0]).toContain(cartMutateFragment);

    const result5 = await cart.updateDiscountCodes([]);
    expect(result5.errors?.[0]).toContain(cartMutateFragment);

    const result6 = await cart.updateBuyerIdentity({});
    expect(result6.errors?.[0]).toContain(cartMutateFragment);

    const result7 = await cart.updateNote('');
    expect(result7.errors?.[0]).toContain(cartMutateFragment);

    const result8 = await cart.updateSelectedDeliveryOption({
      deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
      deliveryOptionHandle: 'Postal Service',
    });
    expect(result8.errors?.[0]).toContain(cartMutateFragment);

    const result9 = await cart.updateAttributes([]);
    expect(result9.errors?.[0]).toContain(cartMutateFragment);

    const result10 = await cart.setMetafields([]);
    expect(result10.errors?.[0]).not.toContain(cartMutateFragment);

    const result11 = await cart.deleteMetafield('some.key');
    expect(result11.errors?.[0]).not.toContain(cartMutateFragment);
  });

  it('function get has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.get();

    expect(result).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function get can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.get({cartId: 'gid://shopify/Cart/c1-456'});

    expect(result).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function create has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    const result = await cart.create({});

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function addLines has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.addLines([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function addLines can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.addLines([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function addLines to create a cart if cart id is not found', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    const result = await cart.addLines([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateLines has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateLines([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateLines can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateLines([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function removeLines has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.removeLines([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function removeLines can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.removeLines([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateDiscountCodes has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateDiscountCodes([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateDiscountCodes can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateDiscountCodes([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateDiscountCodes to create a cart if cart id is not found', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    const result = await cart.updateDiscountCodes([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateBuyerIdentity has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateBuyerIdentity({});

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateBuyerIdentity can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateBuyerIdentity(
      {},
      {cartId: 'gid://shopify/Cart/c1-456'},
    );

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateBuyerIdentity to create a cart if cart id is not found', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    const result = await cart.updateBuyerIdentity({});

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function updateNote has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateNote('');

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateNote can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateNote('', {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateSelectedDeliveryOption has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateSelectedDeliveryOption({
      deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
      deliveryOptionHandle: 'Postal Service',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateSelectedDeliveryOption can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateSelectedDeliveryOption(
      {
        deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
        deliveryOptionHandle: 'Postal Service',
      },
      {cartId: 'gid://shopify/Cart/c1-456'},
    );

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function updateAttributes has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateAttributes([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function updateAttributes can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.updateAttributes([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function setMetafields has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.setMetafields([]);

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function setMetafields can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.setMetafields([], {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });

  it('function setMetafields to create a cart if cart id is not found', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders(),
    });

    const result = await cart.setMetafields([]);

    expect(result.cart).toHaveProperty('id', 'c1-new-cart-id');
  });

  it('function deleteMetafield has a working default implementation', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.deleteMetafield('some.key');

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-123');
  });

  it('function deleteMetafield can provide overridable parameter', async () => {
    const cart = createCartHandler_unstable({
      storefront: mockCreateStorefrontClient(),
      requestHeaders: mockHeaders('c1-123'),
    });

    const result = await cart.deleteMetafield('some.key', {
      cartId: 'gid://shopify/Cart/c1-456',
    });

    expect(result.cart).toHaveProperty('id', 'gid://shopify/Cart/c1-456');
  });
});
