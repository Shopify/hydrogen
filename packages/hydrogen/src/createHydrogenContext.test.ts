import {vi, describe, it, expect, afterEach, expectTypeOf} from 'vitest';
import {createHydrogenContext} from './createHydrogenContext';
import {createStorefrontClient, I18nBase} from './storefront';
import {createCustomerAccountClient} from './customer/customer';
import {
  createCartHandler,
  type HydrogenCart,
  type HydrogenCartCustom,
} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import type {CustomerAccount} from './customer/types';
import type {HydrogenSession} from './types';

vi.mock('./storefront', async () => ({
  createStorefrontClient: vi.fn(() => ({
    storefront: {},
  })),
}));

vi.mock('./customer/customer', async () => ({
  createCustomerAccountClient: vi.fn(() => ({isLoggedIn: true})),
}));

vi.mock('./cart/createCartHandler', async () => ({
  createCartHandler: vi.fn(() => ({get: vi.fn()})),
}));

vi.mock('./cart/cartGetIdDefault', async () => ({
  cartGetIdDefault: vi.fn(() => ({})),
}));

vi.mock('./cart/cartSetIdDefault', async () => ({
  cartSetIdDefault: vi.fn(() => ({})),
}));

vi.stubGlobal(
  'Response',
  class Response {
    message;
    headers;
    status;
    constructor(body: any, options: any) {
      this.headers = options?.headers;
      this.status = options?.status;
      this.message = body;
    }
  },
);

const mockEnv = {
  SESSION_SECRET: 'SESSION_SECRET_value',
  PUBLIC_STOREFRONT_API_TOKEN: 'PUBLIC_STOREFRONT_API_TOKEN_value',
  PRIVATE_STOREFRONT_API_TOKEN: 'PRIVATE_STOREFRONT_API_TOKEN_value',
  PUBLIC_STORE_DOMAIN: 'PUBLIC_STORE_DOMAIN_value',
  PUBLIC_STOREFRONT_ID: 'PUBLIC_STOREFRONT_ID_value',
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID:
    'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID_value',
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: 'PUBLIC_CUSTOMER_ACCOUNT_API_URL_value',
  PUBLIC_CHECKOUT_DOMAIN: 'PUBLIC_CHECKOUT_DOMAIN_value',
  SHOP_ID: 'SHOP_ID_value',
};

const defaultOptions = {
  env: mockEnv,
  request: new Request('https://localhost'),
  session: {} as HydrogenSession,
};

describe('createHydrogenContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storefront client', () => {
    it('returns storefront client', async () => {
      const hydrogenContext = createHydrogenContext(defaultOptions);

      expect(hydrogenContext).toEqual(
        expect.objectContaining({storefront: expect.any(Object)}),
      );
    });

    it('called createStorefrontClient with default values', async () => {
      const mockRequest = new Request('https://localhost');

      createHydrogenContext({
        ...defaultOptions,
        request: mockRequest,
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          publicStorefrontToken: mockEnv.PUBLIC_STOREFRONT_API_TOKEN,
          privateStorefrontToken: mockEnv.PRIVATE_STOREFRONT_API_TOKEN,
          storeDomain: mockEnv.PUBLIC_STORE_DOMAIN,
          storefrontId: mockEnv.PUBLIC_STOREFRONT_ID,
          storefrontHeaders: expect.anything(),
        }),
      );
    });

    it('called createStorefrontClient with overwrite default values', async () => {
      const mockStorefrontHeaders = {
        requestGroupId: 'requestGroupId value',
        buyerIp: 'buyerIp value',
        cookie: 'cookie value',
        purpose: 'purpose value',
      };

      createHydrogenContext({
        ...defaultOptions,
        storefront: {
          headers: mockStorefrontHeaders,
        },
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          storefrontHeaders: mockStorefrontHeaders,
        }),
      );
    });

    it('called createStorefrontClient with values that does not have default', async () => {
      createHydrogenContext({
        ...defaultOptions,
        i18n: {language: 'EN', country: 'CA'},
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          i18n: {language: 'EN', country: 'CA'},
        }),
      );
    });

    it('does not call getStorefrontHeaders when storefrontHeaders is provided', async () => {
      const mockeStorefrontHeaders = {
        requestGroupId: 'requestGroupId value',
        buyerIp: 'buyerIp value',
        cookie: 'cookie value',
        purpose: 'purpose',
      };

      createHydrogenContext({
        ...defaultOptions,
        storefront: {headers: mockeStorefrontHeaders},
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          storefrontHeaders: mockeStorefrontHeaders,
        }),
      );
    });

    it('called createStorefrontClient with renamed apiVersion key', async () => {
      const mockApiVersion = 'new storefrontApiVersion';

      createHydrogenContext({
        ...defaultOptions,
        storefront: {
          apiVersion: mockApiVersion,
        },
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          storefrontApiVersion: mockApiVersion,
        }),
      );
    });

    it('passes the i18n object to the storefront client', async () => {
      const mockI18n: I18nBase = {language: 'EN', country: 'CA'};

      createHydrogenContext({
        ...defaultOptions,
        i18n: mockI18n,
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          i18n: mockI18n,
        }),
      );
    });
  });

  describe('customerAccount client', () => {
    it('called createCustomerAccountClient with default values', async () => {
      createHydrogenContext(defaultOptions);

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          customerAccountId: mockEnv.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
          shopId: mockEnv.SHOP_ID,
        }),
      );
    });

    it('called createCustomerAccountClient with values that does not have default', async () => {
      const mockAuthUrl = 'customerAccountId overwrite';
      createHydrogenContext({
        ...defaultOptions,
        customerAccount: {
          authUrl: mockAuthUrl,
        },
      });

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          authUrl: mockAuthUrl,
        }),
      );
    });

    it('called createCustomerAccountClient with renamed apiVersion key', async () => {
      const mockApiVersion = 'new customerApiVersion';

      createHydrogenContext({
        ...defaultOptions,
        customerAccount: {
          apiVersion: mockApiVersion,
        },
      });

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          customerApiVersion: mockApiVersion,
        }),
      );
    });
  });

  describe('cart client', () => {
    it('returns cart client', async () => {
      const hydrogenContext = createHydrogenContext(defaultOptions);

      expect(hydrogenContext).toStrictEqual(
        expect.objectContaining({cart: expect.any(Object)}),
      );
    });

    it('called createCartHandler with default values', async () => {
      const mockRequest = new Request('https://localhost');

      const hydrogenContext = createHydrogenContext({
        ...defaultOptions,
        request: mockRequest,
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          storefront: hydrogenContext.storefront,
          customerAccount: hydrogenContext.customerAccount,
          getCartId: expect.anything(),
          setCartId: expect.anything(),
        }),
      );

      expect(vi.mocked(cartGetIdDefault)).toHaveBeenCalledOnce();
      expect(vi.mocked(cartGetIdDefault)).toHaveBeenCalledWith(
        mockRequest.headers,
      );

      expect(vi.mocked(cartSetIdDefault)).toHaveBeenCalledOnce();
      expect(vi.mocked(cartSetIdDefault)).toHaveBeenCalledWith();
    });

    it('called createCartHandler with overwrite default values', async () => {
      const mockGetCartId = () => {
        return 'mock getCartId';
      };

      createHydrogenContext({
        ...defaultOptions,
        cart: {
          getId: mockGetCartId,
        },
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          getCartId: mockGetCartId,
        }),
      );
    });

    it('called createCartHandler with values that does not have default', async () => {
      const mockCartQueryFragment = 'mock cartQueryFragment';

      createHydrogenContext({
        ...defaultOptions,
        cart: {
          queryFragment: mockCartQueryFragment,
        },
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          cartQueryFragment: mockCartQueryFragment,
        }),
      );
    });

    it('does not call cartGetIdDefault when getCartId is provided', async () => {
      const mockGetCartId = () => {
        return 'mock getCartId';
      };

      createHydrogenContext({
        ...defaultOptions,
        cart: {
          getId: mockGetCartId,
        },
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          getCartId: mockGetCartId,
        }),
      );

      expect(vi.mocked(cartGetIdDefault)).not.toHaveBeenCalled();
    });

    it('does not call cartSetIdDefault when setCartId is provided', async () => {
      const mockSetCartId = () => {
        return new Headers();
      };

      createHydrogenContext({
        ...defaultOptions,
        cart: {
          setId: mockSetCartId,
        },
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          setCartId: mockSetCartId,
        }),
      );

      expect(vi.mocked(cartSetIdDefault)).not.toHaveBeenCalled();
    });

    it('called createCartHandler with renamed queryFragment key', async () => {
      const mockQueryFragment = 'new queryFragment';

      createHydrogenContext({
        ...defaultOptions,
        cart: {
          queryFragment: mockQueryFragment,
        },
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          cartQueryFragment: mockQueryFragment,
        }),
      );
    });

    it('called createCartHandler with renamed mutateFragment key', async () => {
      const mockMutateFragment = 'new mutateFragment';

      createHydrogenContext({
        ...defaultOptions,
        cart: {
          mutateFragment: mockMutateFragment,
        },
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          cartMutateFragment: mockMutateFragment,
        }),
      );
    });

    describe('cart return based on options', () => {
      it('returns cart handler with HydrogenCart if there cart.customMethods key does not exist', async () => {
        const hydrogenContext = createHydrogenContext(defaultOptions);

        expect(hydrogenContext).toHaveProperty('cart');
        expectTypeOf(hydrogenContext.cart).toEqualTypeOf<HydrogenCart>();
      });

      it('returns cart handler with HydrogenCart if there cart.customMethods is undefined', async () => {
        const hydrogenContext = createHydrogenContext({
          ...defaultOptions,
          cart: {customMethods: undefined},
        });

        expect(hydrogenContext).toHaveProperty('cart');
        expectTypeOf(hydrogenContext.cart).toEqualTypeOf<HydrogenCart>();
      });

      it('returns cart handler with HydrogenCartCustom if there cart.customMethods is defined', async () => {
        const customMethods = {arrowFunction: () => {}};

        const hydrogenContext = createHydrogenContext({
          ...defaultOptions,
          cart: {customMethods},
        });

        expect(hydrogenContext).toHaveProperty('cart');
        expectTypeOf(hydrogenContext.cart).toEqualTypeOf<
          HydrogenCartCustom<typeof customMethods>
        >();
      });

      it('returns cart handler with HydrogenCartCustom if there cart.customMethods is defined using method definition', async () => {
        const customMethods = {methodDefinition() {}};

        const hydrogenContext = createHydrogenContext({
          ...defaultOptions,
          cart: {customMethods},
        });

        expect(hydrogenContext).toHaveProperty('cart');
        expectTypeOf(hydrogenContext.cart).toEqualTypeOf<
          HydrogenCartCustom<typeof customMethods>
        >();
      });

      it('returns cart handler with HydrogenCartCustom if there cart.customMethods is defined using method definition and declare inline', async () => {
        // this will pass in ts file but fail in js file.
        // which is why we still left a note in the custom-cart-method example to avoid using method definition
        const hydrogenContext = createHydrogenContext({
          ...defaultOptions,
          cart: {
            customMethods: {
              methodDefinition() {},
            },
          },
        });

        expect(hydrogenContext).toHaveProperty('cart');
        expectTypeOf(hydrogenContext.cart).toEqualTypeOf<
          HydrogenCartCustom<{methodDefinition(): void}>
        >();
      });

      it('returns cart handler with HydrogenCart if there cart.customMethods is an empty object', async () => {
        const hydrogenContext = createHydrogenContext({
          ...defaultOptions,
          cart: {
            customMethods: {},
          },
        });

        expect(hydrogenContext).toHaveProperty('cart');
        expectTypeOf(hydrogenContext.cart).toEqualTypeOf<HydrogenCart>();
      });
    });
  });

  describe('env', () => {
    it('returns env as it was passed in', async () => {
      const customizedEnv = {...mockEnv, extraKey: 'extra key value'};

      const hydrogenContext = createHydrogenContext({
        ...defaultOptions,
        env: customizedEnv,
      });

      expect(hydrogenContext).toStrictEqual(
        expect.objectContaining({env: customizedEnv}),
      );
    });
  });

  describe('waitUntil', () => {
    it('returns waitUntil as it was passed in', async () => {
      const mockWaitUntil = vi.fn();
      const second = vi.fn();

      const hydrogenContext = createHydrogenContext({
        ...defaultOptions,
        waitUntil: mockWaitUntil,
      });

      expect(hydrogenContext).toStrictEqual(
        expect.objectContaining({waitUntil: mockWaitUntil}),
      );
    });
  });

  describe('session', () => {
    it('returns waitUntil as it was passed in', async () => {
      const mockSession = {} as HydrogenSession;

      const hydrogenContext = createHydrogenContext({
        ...defaultOptions,
        session: mockSession,
      });

      expect(hydrogenContext).toStrictEqual(
        expect.objectContaining({session: mockSession}),
      );
    });
  });
});
