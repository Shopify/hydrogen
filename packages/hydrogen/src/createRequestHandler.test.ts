// @vitest-environment node
import {vi, describe, it, expect, beforeEach} from 'vitest';
import {createRequestHandler} from './createRequestHandler.js';

const mockReactRouterHandler =
  vi.fn<(request: Request, context: any) => Promise<Response>>();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    createRequestHandler: () => mockReactRouterHandler,
  };
});

function createMockStorefront({
  isStorefrontApiUrl = (() => false) as (req: Request) => boolean,
  forward = () => Promise.resolve(new Response('forwarded')),
  setCollectedSubrequestHeaders = () => {},
} = {}) {
  return {isStorefrontApiUrl, forward, setCollectedSubrequestHeaders};
}

function createConsentProxyRequest(
  cookie?: string,
  url = 'https://shop.example.com/api/unstable/graphql.json',
) {
  const headers: Record<string, string> = {
    'Shopify-Storefront-Consent-Management': '1',
  };
  if (cookie) headers.cookie = cookie;

  return new Request(url, {method: 'POST', body: '{}', headers});
}

const EXPIRY_COOKIE_PREFIX =
  '=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

function createDocumentRequest(url = 'https://store.test/') {
  return new Request(url, {
    headers: {'sec-fetch-dest': 'document', accept: 'text/html'},
  });
}

describe('createRequestHandler', () => {
  beforeEach(() => {
    mockReactRouterHandler.mockReset();
    mockReactRouterHandler.mockResolvedValue(new Response('ok'));
  });

  it('throws when storefront is missing from load context', async () => {
    const handler = createRequestHandler({
      build: {} as any,
      getLoadContext: () => ({}),
    });

    const request = createDocumentRequest();

    await expect(handler(request)).rejects.toThrow(
      'Storefront instance is required',
    );
  });

  it('proxies SFAPI requests when storefront is present', async () => {
    const forwardMock = vi.fn().mockResolvedValue(new Response('proxied'));
    const storefront = createMockStorefront({
      isStorefrontApiUrl: () => true,
      forward: forwardMock,
    });

    const handler = createRequestHandler({
      build: {} as any,
      getLoadContext: () => ({storefront}) as any,
    });

    const request = new Request('https://store.test/api/2024-01/graphql.json', {
      method: 'POST',
    });
    const response = await handler(request);

    expect(forwardMock).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe('proxied');
  });

  describe('legacy tracking cookie expiry', () => {
    it('expires _shopify_y/_shopify_s for the host and each domain suffix on the consent request', async () => {
      const storefront = createMockStorefront({isStorefrontApiUrl: () => true});

      const handler = createRequestHandler({
        build: {} as any,
        getLoadContext: () => ({storefront}) as any,
      });

      const request = createConsentProxyRequest(
        '_shopify_y=legacy-unique; _shopify_s=legacy-visit; other=1',
      );
      const response = await handler(request);

      const setCookies = response.headers.getSetCookie();

      // shop.example.com -> host-only, shop.example.com, example.com
      expect(setCookies).toContain(`_shopify_y${EXPIRY_COOKIE_PREFIX}`);
      expect(setCookies).toContain(
        `_shopify_y${EXPIRY_COOKIE_PREFIX}; Domain=shop.example.com`,
      );
      expect(setCookies).toContain(
        `_shopify_y${EXPIRY_COOKIE_PREFIX}; Domain=example.com`,
      );
      expect(setCookies).toContain(`_shopify_s${EXPIRY_COOKIE_PREFIX}`);
      expect(setCookies).toContain(
        `_shopify_s${EXPIRY_COOKIE_PREFIX}; Domain=shop.example.com`,
      );
      expect(setCookies).toContain(
        `_shopify_s${EXPIRY_COOKIE_PREFIX}; Domain=example.com`,
      );
    });

    it('does not expire cookies when the marker header is absent', async () => {
      const storefront = createMockStorefront({isStorefrontApiUrl: () => true});

      const handler = createRequestHandler({
        build: {} as any,
        getLoadContext: () => ({storefront}) as any,
      });

      const request = new Request(
        'https://shop.example.com/api/unstable/graphql.json',
        {
          method: 'POST',
          body: '{}',
          headers: {cookie: '_shopify_y=legacy-unique'},
        },
      );
      const response = await handler(request);

      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it('does not expire cookies when the proxied response is not ok', async () => {
      const storefront = createMockStorefront({
        isStorefrontApiUrl: () => true,
        forward: () => Promise.resolve(new Response('error', {status: 500})),
      });

      const handler = createRequestHandler({
        build: {} as any,
        getLoadContext: () => ({storefront}) as any,
      });

      const request = createConsentProxyRequest('_shopify_y=legacy-unique');
      const response = await handler(request);

      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it('does not expire cookies when the request carries none', async () => {
      const storefront = createMockStorefront({isStorefrontApiUrl: () => true});

      const handler = createRequestHandler({
        build: {} as any,
        getLoadContext: () => ({storefront}) as any,
      });

      const request = createConsentProxyRequest(
        '_shopify_essential=1; other=2',
      );
      const response = await handler(request);

      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it('expires only the host-only cookie for IP hosts', async () => {
      const storefront = createMockStorefront({isStorefrontApiUrl: () => true});

      const handler = createRequestHandler({
        build: {} as any,
        getLoadContext: () => ({storefront}) as any,
      });

      const request = createConsentProxyRequest(
        '_shopify_y=legacy-unique',
        'https://127.0.0.1/api/unstable/graphql.json',
      );
      const response = await handler(request);

      const setCookies = response.headers.getSetCookie();

      expect(setCookies).toEqual([`_shopify_y${EXPIRY_COOKIE_PREFIX}`]);
    });

    it('expires only the host-only cookie for single-label hosts like localhost', async () => {
      const storefront = createMockStorefront({isStorefrontApiUrl: () => true});

      const handler = createRequestHandler({
        build: {} as any,
        getLoadContext: () => ({storefront}) as any,
      });

      const request = createConsentProxyRequest(
        '_shopify_y=legacy-unique',
        'https://localhost:3000/api/unstable/graphql.json',
      );
      const response = await handler(request);

      const setCookies = response.headers.getSetCookie();

      expect(setCookies).toEqual([`_shopify_y${EXPIRY_COOKIE_PREFIX}`]);
    });
  });
});
