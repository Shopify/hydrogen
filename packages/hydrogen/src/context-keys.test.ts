import {describe, it, expect, beforeEach, vi} from 'vitest';
import {unstable_RouterContextProvider} from 'react-router';
import {hydrogenContext} from './context-keys';
import {createHydrogenContext} from './createHydrogenContext';

describe('hydrogenContext', () => {
  describe('context key exports', () => {
    it('should export hydrogenContext object with all service keys', () => {
      expect(hydrogenContext).toBeDefined();
      expect(hydrogenContext.storefront).toBeDefined();
      expect(hydrogenContext.cart).toBeDefined();
      expect(hydrogenContext.customerAccount).toBeDefined();
      expect(hydrogenContext.env).toBeDefined();
      expect(hydrogenContext.session).toBeDefined();
      expect(hydrogenContext.waitUntil).toBeDefined();
    });

    it('should have the correct structure', () => {
      const keys = Object.keys(hydrogenContext);
      expect(keys).toEqual([
        'storefront',
        'cart',
        'customerAccount',
        'env',
        'session',
        'waitUntil',
      ]);
    });
  });

  describe('context.get() and context.set() functionality', () => {
    let context: any;
    let mockRequest: Request;
    let mockSession: any;
    let mockEnv: any;

    beforeEach(() => {
      mockRequest = new Request('http://localhost');
      mockSession = {
        commit: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        unset: vi.fn(),
        destroy: vi.fn(),
      };
      mockEnv = {
        PUBLIC_STOREFRONT_API_TOKEN: 'mock-token',
        PUBLIC_STORE_DOMAIN: 'mock-store.myshopify.com',
        SESSION_SECRET: 'mock-secret',
        PRIVATE_STOREFRONT_API_TOKEN: '',
        PUBLIC_STOREFRONT_ID: '',
        PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: '',
        PUBLIC_CUSTOMER_ACCOUNT_API_URL: '',
        PUBLIC_CHECKOUT_DOMAIN: '',
        PUBLIC_STOREFRONT_API_VERSION: '',
        SHOP_ID: '',
      };

      // Create a hydrogen context
      context = createHydrogenContext({
        env: mockEnv,
        request: mockRequest,
        session: mockSession,
      });
    });

    it('should support context.get() for storefront', () => {
      // The context should have a get method from unstable_RouterContextProvider
      expect(typeof context.get).toBe('function');

      // Get the storefront using context.get()
      const storefront = context.get(hydrogenContext.storefront);
      expect(storefront).toBeDefined();
    });

    it('should support context.get() for cart', () => {
      const cart = context.get(hydrogenContext.cart);
      expect(cart).toBeDefined();
      expect(typeof cart.addLines).toBe('function');
    });

    it('should support context.get() for customerAccount', () => {
      const customerAccount = context.get(hydrogenContext.customerAccount);
      expect(customerAccount).toBeDefined();
    });

    it('should support context.get() for env', () => {
      const env = context.get(hydrogenContext.env);
      expect(env).toBeDefined();
      expect(env.PUBLIC_STOREFRONT_API_TOKEN).toBe('mock-token');
    });

    it('should support context.get() for session', () => {
      const session = context.get(hydrogenContext.session);
      expect(session).toBeDefined();
      expect(typeof session.commit).toBe('function');
    });

    it('should support context.set() for custom values', () => {
      // The context should have a set method from unstable_RouterContextProvider
      expect(typeof context.set).toBe('function');

      // Create a custom context key
      const customKey = Symbol('custom');
      const customValue = {test: 'value'};

      // Set and get custom value
      context.set(customKey, customValue);
      const retrieved = context.get(customKey);
      expect(retrieved).toEqual(customValue);
    });

    it('should support both direct access and context.get() patterns', () => {
      // Direct access pattern
      expect(context.storefront).toBeDefined();
      expect(context.cart).toBeDefined();
      expect(context.env.PUBLIC_STOREFRONT_API_TOKEN).toBe('mock-token');

      // context.get() pattern
      const storefrontViaGet = context.get(hydrogenContext.storefront);
      const cartViaGet = context.get(hydrogenContext.cart);
      const envViaGet = context.get(hydrogenContext.env);

      // Both should return the same instances
      expect(storefrontViaGet).toBe(context.storefront);
      expect(cartViaGet).toBe(context.cart);
      expect(envViaGet).toBe(context.env);
    });
  });

  describe('proxy behavior', () => {
    it('should support all RouterContextProvider methods', () => {
      const mockRequest = new Request('http://localhost');
      const mockSession = {
        commit: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        unset: vi.fn(),
        destroy: vi.fn(),
      };
      const mockEnv = {
        PUBLIC_STOREFRONT_API_TOKEN: 'mock-token',
        PUBLIC_STORE_DOMAIN: 'mock-store.myshopify.com',
        SESSION_SECRET: 'mock-secret',
        PRIVATE_STOREFRONT_API_TOKEN: '',
        PUBLIC_STOREFRONT_ID: '',
        PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: '',
        PUBLIC_CUSTOMER_ACCOUNT_API_URL: '',
        PUBLIC_CHECKOUT_DOMAIN: '',
        PUBLIC_STOREFRONT_API_VERSION: '',
        SHOP_ID: '',
      };

      const context = createHydrogenContext({
        env: mockEnv,
        request: mockRequest,
        session: mockSession,
      });

      // Check that RouterContextProvider methods are available
      expect(typeof context.get).toBe('function');
      expect(typeof context.set).toBe('function');

      // Check that Hydrogen services are also available
      expect(context.storefront).toBeDefined();
      expect(context.cart).toBeDefined();
      expect(context.customerAccount).toBeDefined();
      expect(context.env).toBeDefined();
      expect(context.session).toBeDefined();
    });
  });
});
