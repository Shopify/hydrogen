import {vi, describe, it, expect, afterEach, expectTypeOf} from 'vitest';
import {createHydrogenContext} from './createHydrogenContext';
import {createStorefrontClient} from './storefront';
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
    storefront: {i18n: {language: 'EN', country: 'US'}},
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
};

const defaultOptions = {
  env: mockEnv,
  request: new Request('https://localhost'),
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
          i18n: {language: 'EN', country: 'US'},
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
        storefront: {contentType: 'graphql'},
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'graphql',
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
  });

  describe('customerAccount client', () => {
    const defaultOptionsWithCustomerAccount = {
      ...defaultOptions,
      session: {} as HydrogenSession,
    };

    it('called createCustomerAccountClient with default values', async () => {
      createHydrogenContext(defaultOptionsWithCustomerAccount);

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          customerAccountId: mockEnv.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
          customerAccountUrl: mockEnv.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
        }),
      );
    });

    it('called createCustomerAccountClient with values that does not have default', async () => {
      const mockAuthUrl = 'customerAccountId overwrite';
      createHydrogenContext({
        ...defaultOptionsWithCustomerAccount,
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
        ...defaultOptionsWithCustomerAccount,
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

    describe('customerAccount return based on options', () => {
      it('returns customerAccount client if session exist and useStorefrontAPI is not set', async () => {
        const hydrogenContext = createHydrogenContext(
          defaultOptionsWithCustomerAccount,
        );

        expect(hydrogenContext).toHaveProperty('customerAccount');
        expectTypeOf(
          hydrogenContext.customerAccount,
        ).toEqualTypeOf<CustomerAccount>();
      });

      it('returns customerAccount client if session exist and useStorefrontAPI is false', async () => {
        const hydrogenContext = createHydrogenContext({
          ...defaultOptionsWithCustomerAccount,
          customerAccount: {
            useStorefrontAPI: false,
          },
        });

        expect(hydrogenContext).toHaveProperty('customerAccount');
        expectTypeOf(
          hydrogenContext.customerAccount,
        ).toEqualTypeOf<CustomerAccount>();
      });

      it('does not returns customerAccount client if session exist and useStorefrontAPI is true', async () => {
        const hydrogenContext = createHydrogenContext({
          ...defaultOptionsWithCustomerAccount,
          customerAccount: {
            useStorefrontAPI: true,
          },
          session: undefined,
        });

        expect(hydrogenContext).toHaveProperty('customerAccount');
        expect(hydrogenContext.customerAccount).toBeUndefined();
      });

      it('does not returns customerAccount client if there is no session', async () => {
        const hydrogenContext = createHydrogenContext({
          ...defaultOptionsWithCustomerAccount,
          session: undefined,
        });

        expect(hydrogenContext).toHaveProperty('customerAccount');
        expect(hydrogenContext.customerAccount).toBeUndefined();
      });
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
        const customMethods = {testMethod: () => {}};

        const hydrogenContext = createHydrogenContext({
          ...defaultOptions,
          cart: {customMethods},
        });

        expect(hydrogenContext).toHaveProperty('cart');
        expectTypeOf(hydrogenContext.cart).toEqualTypeOf<
          HydrogenCartCustom<typeof customMethods>
        >();
      });
    });
  });
});
