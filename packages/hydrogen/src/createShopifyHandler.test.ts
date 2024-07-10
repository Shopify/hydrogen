import {vi, describe, it, expect, afterEach} from 'vitest';
import {createShopifyHandler} from './createShopifyHandler';
import {createStorefrontClient} from './storefront';
import {getStorefrontHeaders} from '@shopify/remix-oxygen';
import {createCustomerAccountClient} from './customer/customer';
import {createCartHandler} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';

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

const defaultOptions: Parameters<typeof createShopifyHandler>[0] = {
  env: mockEnv,
  request: new Request('https://localhost'),
  session: {} as any,
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
      const publicStorefrontTokenOverwrite = 'publicStorefrontToken overwrite';

      createShopifyHandler({
        ...defaultOptions,
        publicStorefrontToken: publicStorefrontTokenOverwrite,
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          publicStorefrontToken: publicStorefrontTokenOverwrite,
        }),
      );
    });

    it('called createStorefrontClient with values that does not have default', async () => {
      createShopifyHandler({
        ...defaultOptions,
        contentType: 'graphql',
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
        storefrontHeaders: mockeStorefrontHeaders,
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          storefrontHeaders: mockeStorefrontHeaders,
        }),
      );

      expect(vi.mocked(getStorefrontHeaders)).not.toHaveBeenCalled();
    });
  });

  describe('customerAccount client', () => {
    it('returns customerAccount client by default', async () => {
      const shopify = createShopifyHandler(defaultOptions);

      expect(shopify).toEqual(
        expect.objectContaining({customerAccount: expect.any(Object)}),
      );
    });

    it('returns customerAccount client if useCustomerAccountAPI is true', async () => {
      const shopify = createShopifyHandler({
        ...defaultOptions,
        useCustomerAccountAPI: true,
      });

      expect(shopify).toEqual(
        expect.objectContaining({customerAccount: expect.any(Object)}),
      );
    });

    it('does not return customerAccount client if useCustomerAccountAPI is false', async () => {
      const shopify = createShopifyHandler({
        ...defaultOptions,
        useCustomerAccountAPI: false,
      });

      expect(shopify).toEqual(
        expect.objectContaining({customerAccount: undefined}),
      );
    });

    it('called createCustomerAccountClient with default values', async () => {
      createShopifyHandler(defaultOptions);

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          customerAccountId: mockEnv.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
          customerAccountUrl: mockEnv.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
        }),
      );
    });

    it('called createCustomerAccountClient with overwrite default values', async () => {
      const mockCustomerAccountId = 'customerAccountId overwrite';

      createShopifyHandler({
        ...defaultOptions,
        customerAccountId: mockCustomerAccountId,
      });

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          customerAccountId: mockCustomerAccountId,
        }),
      );
    });

    it('called createCustomerAccountClient with values that does not have default', async () => {
      const mockAuthUrl = 'customerAccountId overwrite';
      createShopifyHandler({
        ...defaultOptions,
        authUrl: mockAuthUrl,
      });

      expect(vi.mocked(createCustomerAccountClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          authUrl: mockAuthUrl,
        }),
      );
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
        getCartId: mockGetCartId,
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
        expect.objectContaining({
          getCartId: mockGetCartId,
        }),
      );
    });

    it('called createCartHandler with values that does not have default', async () => {
      const mockCartQueryFragment = 'mock cartQueryFragment';

      createShopifyHandler({
        ...defaultOptions,
        cartQueryFragment: mockCartQueryFragment,
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith(
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
        getCartId: mockGetCartId,
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
        setCartId: mockSetCartId,
      });

      expect(vi.mocked(createCartHandler)).toHaveBeenCalledWith(
        expect.objectContaining({
          setCartId: mockSetCartId,
        }),
      );

      expect(vi.mocked(cartSetIdDefault)).not.toHaveBeenCalled();
    });
  });
});
