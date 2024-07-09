import {vi, describe, it, expect, afterEach} from 'vitest';
import {createShopifyHandler} from './createShopifyHandler';
import {createStorefrontClient} from './storefront';
import {getStorefrontHeaders} from '@shopify/remix-oxygen';

vi.mock('./storefront', async () => {
  return {
    createStorefrontClient: vi.fn(() => ({storefront: {}})),
  };
});

vi.mock('@shopify/remix-oxygen', async () => {
  return {
    getStorefrontHeaders: vi.fn(),
  };
});

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

describe('createShopifyHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storefront client', () => {
    it('returns storefront client', async () => {
      const shopify = createShopifyHandler({
        env: mockEnv,
        request: new Request('https://localhost'),
      });

      expect(shopify).toEqual(
        expect.objectContaining({storefront: expect.any(Object)}),
      );
    });

    it('called createStorefrontClient with default values', async () => {
      const mockRequest = new Request('https://localhost');

      createShopifyHandler({
        env: mockEnv,
        request: mockRequest,
      });

      expect(vi.mocked(createStorefrontClient)).toHaveBeenCalledWith({
        i18n: {language: 'EN', country: 'US'},
        publicStorefrontToken: mockEnv.PUBLIC_STOREFRONT_API_TOKEN,
        privateStorefrontToken: mockEnv.PRIVATE_STOREFRONT_API_TOKEN,
        storeDomain: mockEnv.PUBLIC_STORE_DOMAIN,
        storefrontId: mockEnv.PUBLIC_STOREFRONT_ID,
        storefrontHeaders: getStorefrontHeaders(mockRequest),
      });

      // once in the test, once in createStorefrontClient
      expect(vi.mocked(getStorefrontHeaders)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(getStorefrontHeaders)).toHaveBeenCalledWith(mockRequest);
    });

    it('called createStorefrontClient with overwrite values', async () => {
      const publicStorefrontTokenOverwrite = 'publicStorefrontToken overwrite';

      createShopifyHandler({
        env: mockEnv,
        request: new Request('https://localhost'),
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
        env: mockEnv,
        request: new Request('https://localhost'),
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
        env: mockEnv,
        request: new Request('https://localhost'),
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
});
