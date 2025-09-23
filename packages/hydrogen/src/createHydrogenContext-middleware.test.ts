import {describe, it, expect, vi} from 'vitest';
import {createHydrogenContext} from './createHydrogenContext';
import type {HydrogenSession} from './types';
import {
  cartContext,
  envContext,
  sessionContext,
  storefrontContext,
} from './context-keys';

describe('createHydrogenContext with v8_middleware compatibility', () => {
  const mockRequest = new Request('http://localhost');
  const mockEnv = {
    SESSION_SECRET: 'test-secret',
    PUBLIC_STOREFRONT_API_TOKEN: 'test-token',
    PRIVATE_STOREFRONT_API_TOKEN: 'private-test-token',
    PUBLIC_STORE_DOMAIN: 'test.myshopify.com',
    PUBLIC_STOREFRONT_ID: 'test-id',
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: 'test-client-id',
    PUBLIC_CUSTOMER_ACCOUNT_API_URL: 'https://test.account.api',
    PUBLIC_CHECKOUT_DOMAIN: 'test.checkout.com',
    SHOP_ID: 'test-shop-id',
  };

  const mockSession: HydrogenSession = {
    get: vi.fn(),
    set: vi.fn(),
    unset: vi.fn(),
    commit: vi.fn(() => Promise.resolve('cookie')),
    isPending: false,
  };

  const mockWaitUntil = vi.fn();
  const mockCache = {} as Cache;

  it('should support both direct property access and get() method', async () => {
    const context = await createHydrogenContext(
      {
        env: mockEnv,
        request: mockRequest,
        cache: mockCache,
        waitUntil: mockWaitUntil,
        session: mockSession,
        i18n: {language: 'EN', country: 'US'},
        cart: {},
      },
      {},
    );

    // v8_middleware expects get() method for context access
    expect(context.get).toBeDefined();
    expect(typeof context.get).toBe('function');

    // But our Proxy should also support direct property access for backward compatibility
    expect(context.session).toBeDefined();
    expect(context.session).toBe(mockSession);
    expect(context.storefront).toBeDefined();
    expect(context.cart).toBeDefined();
    expect(context.env).toBe(mockEnv);

    // Compare some of the results
    expect(context.get(sessionContext)).toBe(context.session);
    expect(context.get(storefrontContext)).toBe(context.storefront);
    expect(context.get(cartContext)).toBe(context.cart);
    expect(context.get(envContext)).toBe(context.env);
  });

  it('should work with v8_middleware context pattern', async () => {
    const context = await createHydrogenContext(
      {
        env: mockEnv,
        request: mockRequest,
        cache: mockCache,
        waitUntil: mockWaitUntil,
        session: mockSession,
        i18n: {language: 'EN', country: 'US'},
        cart: {},
      },
      {},
    );

    expect(context.get).toBeDefined();
    expect(context.set).toBeDefined();

    expect(typeof context.get).toBe('function');
    expect(typeof context.set).toBe('function');

    const mockSession2: HydrogenSession = {
      get: vi.fn(),
      set: vi.fn(),
      unset: vi.fn(),
      commit: vi.fn(() => Promise.resolve('cookie')),
      isPending: false,
    };

    expect(context.get(sessionContext)).toBe(mockSession);
    context.set(sessionContext, mockSession2);
    expect(context.get(sessionContext)).toBe(mockSession2);
  });

  it('should maintain context key access through get() method', async () => {
    const context = await createHydrogenContext(
      {
        env: mockEnv,
        request: mockRequest,
        cache: mockCache,
        waitUntil: mockWaitUntil,
        session: mockSession,
        i18n: {language: 'EN', country: 'US'},
        cart: {},
      },
      {},
    );

    const {sessionContext, storefrontContext, cartContext, envContext} =
      await import('./context-keys');

    const sessionViaGet = context.get(sessionContext);
    expect(sessionViaGet).toBe(mockSession);

    const storefrontViaGet = context.get(storefrontContext);
    expect(storefrontViaGet).toBeDefined();
    expect(storefrontViaGet.query).toBeDefined();

    const cartViaGet = context.get(cartContext);
    expect(cartViaGet).toBeDefined();

    const envViaGet = context.get(envContext);
    expect(envViaGet).toBe(mockEnv);
  });

  it('should work in server.ts pattern with getLoadContext', async () => {
    const context = await createHydrogenContext(
      {
        env: mockEnv,
        request: mockRequest,
        cache: mockCache,
        waitUntil: mockWaitUntil,
        session: mockSession,
        i18n: {language: 'EN', country: 'US'},
        cart: {},
      },
      {},
    );

    // Simulate what happens in server.ts
    const getLoadContext = () => context;
    const loadContext = getLoadContext();

    // This is the pattern used in the template - direct property access
    expect(loadContext.session).toBeDefined();
    expect(loadContext.session.isPending).toBe(false);
    expect(loadContext.session.commit).toBeDefined();

    expect(loadContext.storefront).toBeDefined();
    expect(loadContext.storefront.query).toBeDefined();
  });

  it('should properly type check with TypeScript types', async () => {
    const context = await createHydrogenContext(
      {
        env: mockEnv,
        request: mockRequest,
        cache: mockCache,
        waitUntil: mockWaitUntil,
        session: mockSession,
        i18n: {language: 'EN', country: 'US'},
        cart: {},
      },
      {},
    );

    const {session, storefront, cart, customerAccount, env} = context;

    expect(session).toBe(mockSession);
    expect(storefront).toBeDefined();
    expect(cart).toBeDefined();
    expect(customerAccount).toBeDefined();
    expect(env).toBe(mockEnv);

    const {get, set} = context;

    expect(typeof get).toBe('function');
    expect(typeof set).toBe('function');
  });
});
