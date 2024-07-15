import {
  vi,
  describe,
  it,
  expect,
  afterEach,
  assertType,
  expectTypeOf,
} from 'vitest';
import {
  createShopifyHandler,
  type ShopifyHandlerOptions,
} from './createShopifyHandler';
import {createStorefrontClient} from './storefront';
import {getStorefrontHeaders} from '@shopify/remix-oxygen';
import {createCustomerAccountClient} from './customer/customer';
import {createCartHandler} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import type {CustomerAccount} from './customer/types';
import type {HydrogenSession} from './types';

vi.mock('./storefront', async () => ({
  createStorefrontClient: vi.fn(() => ({
    storefront: {i18n: {language: 'EN', country: 'US'}},
  })),
}));

vi.mock('@shopify/remix-oxygen', async () => ({
  getStorefrontHeaders: vi.fn(() => ({})),
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

describe('createShopifyHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storefront client', () => {
    it('returns storefront client', async () => {
      const shopify = createShopifyHandler(defaultOptions);

      expect(shopify).toEqual(
        expect.objectContaining({storefront: expect.any(Object)}),
      );
    });

    it('called createStorefrontClient with default values', async () => {
      const mockRequest = new Request('https://localhost');

      createShopifyHandler({
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

      expect(vi.mocked(getStorefrontHeaders)).toHaveBeenCalledOnce();
      expect(vi.mocked(getStorefrontHeaders)).toHaveBeenCalledWith(mockRequest);
    });

    it('called createStorefrontClient with overwrite default values', async () => {
      const mockStorefrontHeaders = {
        requestGroupId: 'requestGroupId value',
        buyerIp: 'buyerIp value',
        cookie: 'cookie value',
        purpose: 'purpose value',
      };

      createShopifyHandler({
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
      createShopifyHandler({
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

      createShopifyHandler({
        ...defaultOptions,
        storefront: {headers: mockeStorefrontHeaders},
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          storefrontHeaders: mockeStorefrontHeaders,
        }),
      );

      expect(vi.mocked(getStorefrontHeaders)).not.toHaveBeenCalled();
    });

    it('called createStorefrontClient with renamed apiVersion key', async () => {
      const mockApiVersion = 'new storefrontApiVersion';

      createShopifyHandler({
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
      createShopifyHandler(defaultOptionsWithCustomerAccount);

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          customerAccountId: mockEnv.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
          customerAccountUrl: mockEnv.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
        }),
      );
    });

    it('called createCustomerAccountClient with values that does not have default', async () => {
      const mockAuthUrl = 'customerAccountId overwrite';
      createShopifyHandler({
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

      createShopifyHandler({
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
      it('returns customerAccount client if session exist and useCustomerAccountAPI is not set', async () => {
        const shopify = createShopifyHandler(defaultOptionsWithCustomerAccount);

        expect(shopify).toHaveProperty('customerAccount');
        expectTypeOf(shopify.customerAccount).toEqualTypeOf<CustomerAccount>();
      });

      it('returns customerAccount client if session exist and useCustomerAccountAPI is true', async () => {
        const shopify = createShopifyHandler({
          ...defaultOptionsWithCustomerAccount,
          customerAccount: {
            useCustomerAccountAPI: true,
          },
        });

        expect(shopify).toHaveProperty('customerAccount');
        expectTypeOf(shopify.customerAccount).toEqualTypeOf<CustomerAccount>();
      });

      it('does not returns customerAccount client if session exist and useCustomerAccountAPI is false', async () => {
        const shopify = createShopifyHandler({
          ...defaultOptionsWithCustomerAccount,
          customerAccount: {
            useCustomerAccountAPI: false,
          },
          session: undefined,
        });

        expect(shopify).toHaveProperty('customerAccount');
        expect(shopify.customerAccount).toBeUndefined();
      });

      it('does not returns customerAccount client if there is no session', async () => {
        const shopify = createShopifyHandler({
          ...defaultOptionsWithCustomerAccount,
          session: undefined,
        });

        expect(shopify).toHaveProperty('customerAccount');
        expect(shopify.customerAccount).toBeUndefined();
      });
    });
  });

  describe('cart client', () => {
    it('returns cart client', async () => {
      const shopify = createShopifyHandler(defaultOptions);

      expect(shopify).toStrictEqual(
        expect.objectContaining({cart: expect.any(Object)}),
      );
    });

    it('called createCartHandler with default values', async () => {
      const mockRequest = new Request('https://localhost');

      const shopify = createShopifyHandler({
        ...defaultOptions,
        request: mockRequest,
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          storefront: shopify.storefront,
          customerAccount: shopify.customerAccount,
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

      createShopifyHandler({
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

      createShopifyHandler({
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

      createShopifyHandler({
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

      createShopifyHandler({
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

      createShopifyHandler({
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

      createShopifyHandler({
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
  });
});
