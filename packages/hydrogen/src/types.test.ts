import {describe, it, expectTypeOf} from 'vitest';
import type {
  HydrogenRouterContextProvider,
  HydrogenEnv,
  HydrogenSession,
} from './types';
import type {unstable_RouterContextProvider} from 'react-router';
import type {Storefront} from './storefront';
import type {CustomerAccount} from './customer/types';
import type {HydrogenCart} from './cart/createCartHandler';

describe('Type augmentations', () => {
  describe('HydrogenRouterContextProvider', () => {
    it('should extend unstable_RouterContextProvider', () => {
      type Provider = HydrogenRouterContextProvider;

      // Check that it has RouterContextProvider methods
      expectTypeOf<Provider>().toHaveProperty('get');
      expectTypeOf<Provider>().toHaveProperty('set');

      // Check that it has Hydrogen properties
      expectTypeOf<Provider>().toHaveProperty('storefront');
      expectTypeOf<Provider>().toHaveProperty('cart');
      expectTypeOf<Provider>().toHaveProperty('customerAccount');
      expectTypeOf<Provider>().toHaveProperty('env');
      expectTypeOf<Provider>().toHaveProperty('session');
      expectTypeOf<Provider>().toHaveProperty('waitUntil');
    });

    it('should have correct property types', () => {
      type Provider = HydrogenRouterContextProvider;

      // Test individual property types
      expectTypeOf<Provider['storefront']>().toMatchTypeOf<Storefront<any>>();
      expectTypeOf<
        Provider['customerAccount']
      >().toMatchTypeOf<CustomerAccount>();
      expectTypeOf<Provider['cart']>().toMatchTypeOf<HydrogenCart>();
      expectTypeOf<Provider['env']>().toMatchTypeOf<HydrogenEnv>();
      expectTypeOf<Provider['session']>().toMatchTypeOf<HydrogenSession>();
    });

    it('should support generic type parameters', () => {
      // Test with custom session type
      interface CustomSession extends HydrogenSession {
        customField: string;
      }

      type CustomProvider = HydrogenRouterContextProvider<CustomSession>;
      expectTypeOf<CustomProvider['session']>().toMatchTypeOf<CustomSession>();
    });

    it('should support custom cart methods', () => {
      // Test with custom cart methods
      type CustomMethods = {
        customMethod: () => Promise<void>;
      };

      type CustomProvider = HydrogenRouterContextProvider<
        HydrogenSession,
        CustomMethods
      >;

      // The cart should have the custom methods
      expectTypeOf<CustomProvider['cart']>().toHaveProperty('customMethod');
    });

    it('should support custom i18n configuration', () => {
      // Test with custom i18n type
      type CustomI18n = {
        language: 'EN' | 'FR';
        country: 'US' | 'CA';
      };

      type CustomProvider = HydrogenRouterContextProvider<
        HydrogenSession,
        {},
        CustomI18n
      >;

      // The storefront should be typed with custom i18n
      expectTypeOf<CustomProvider['storefront']>().toMatchTypeOf<
        Storefront<CustomI18n>
      >();
    });

    it('should support custom environment variables', () => {
      // Test with custom env type
      interface CustomEnv extends HydrogenEnv {
        CUSTOM_API_KEY: string;
        FEATURE_FLAG: boolean;
      }

      type CustomProvider = HydrogenRouterContextProvider<
        HydrogenSession,
        {},
        any,
        CustomEnv
      >;

      expectTypeOf<CustomProvider['env']>().toMatchTypeOf<CustomEnv>();
      expectTypeOf<CustomProvider['env']>().toHaveProperty('CUSTOM_API_KEY');
      expectTypeOf<CustomProvider['env']>().toHaveProperty('FEATURE_FLAG');
    });

    it('should make waitUntil optional', () => {
      type Provider = HydrogenRouterContextProvider;

      // waitUntil should be optional (can be undefined)
      type WaitUntilType = Provider['waitUntil'];
      expectTypeOf<WaitUntilType>().toEqualTypeOf<
        ((promise: Promise<any>) => void) | undefined
      >;
    });
  });

  describe('HydrogenEnv', () => {
    it('should have required Shopify environment variables', () => {
      expectTypeOf<HydrogenEnv>().toHaveProperty('SESSION_SECRET');
      expectTypeOf<HydrogenEnv>().toHaveProperty('PUBLIC_STOREFRONT_API_TOKEN');
      expectTypeOf<HydrogenEnv>().toHaveProperty(
        'PRIVATE_STOREFRONT_API_TOKEN',
      );
      expectTypeOf<HydrogenEnv>().toHaveProperty('PUBLIC_STORE_DOMAIN');
      expectTypeOf<HydrogenEnv>().toHaveProperty('PUBLIC_STOREFRONT_ID');
      expectTypeOf<HydrogenEnv>().toHaveProperty(
        'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID',
      );
      expectTypeOf<HydrogenEnv>().toHaveProperty(
        'PUBLIC_CUSTOMER_ACCOUNT_API_URL',
      );
      expectTypeOf<HydrogenEnv>().toHaveProperty('PUBLIC_CHECKOUT_DOMAIN');
      expectTypeOf<HydrogenEnv>().toHaveProperty('SHOP_ID');
    });

    it('should have correct property types', () => {
      expectTypeOf<HydrogenEnv['SESSION_SECRET']>().toBeString();
      expectTypeOf<HydrogenEnv['PUBLIC_STOREFRONT_API_TOKEN']>().toBeString();
      expectTypeOf<HydrogenEnv['PUBLIC_STORE_DOMAIN']>().toBeString();
    });
  });

  describe('Type exports', () => {
    it('should export HydrogenRouterContextProvider from index', () => {
      // This verifies that the type is exported from the package
      // Since this is a type-level test, we just verify the import compiles
      type TestImport = import('./index').HydrogenRouterContextProvider;
      expectTypeOf<TestImport>().not.toBeNever();
    });
  });

  describe('React Router augmentation compatibility', () => {
    it('should extend unstable_RouterContextProvider with Hydrogen properties', () => {
      type Provider = HydrogenRouterContextProvider;

      // Should have React Router methods
      expectTypeOf<Provider>().toHaveProperty('get');
      expectTypeOf<Provider>().toHaveProperty('set');

      // Should have Hydrogen properties
      expectTypeOf<Provider>().toHaveProperty('storefront');
      expectTypeOf<Provider>().toHaveProperty('cart');
      expectTypeOf<Provider>().toHaveProperty('customerAccount');
      expectTypeOf<Provider>().toHaveProperty('env');
      expectTypeOf<Provider>().toHaveProperty('session');
      expectTypeOf<Provider>().toHaveProperty('waitUntil');
    });

    it('should have get and set methods with correct signatures', () => {
      type Provider = HydrogenRouterContextProvider;

      // Test get method signature
      type GetMethod = Provider['get'];
      expectTypeOf<GetMethod>().toBeFunction();
      expectTypeOf<GetMethod>().parameters.toMatchTypeOf<[any]>();

      // Test set method signature
      type SetMethod = Provider['set'];
      expectTypeOf<SetMethod>().toBeFunction();
      expectTypeOf<SetMethod>().parameters.toMatchTypeOf<[any, any]>();
    });
  });
});
