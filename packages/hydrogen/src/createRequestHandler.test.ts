import {vi, describe, it, expect, beforeEach} from 'vitest';
import type {ServerBuild} from 'react-router';
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
  isMcpUrl = (() => false) as (req: Request) => boolean,
  getShopifyDomain = (): string => 'https://test-store.myshopify.com',
  setCollectedSubrequestHeaders = () => {},
} = {}) {
  return {
    isStorefrontApiUrl,
    forward,
    isMcpUrl,
    getShopifyDomain,
    setCollectedSubrequestHeaders,
  };
}

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

  describe('buy permalinks', () => {
    function createBuyPermalinkHandler(
      shopifyDomain = 'https://test-store.myshopify.com',
    ) {
      const storefront = createMockStorefront({
        getShopifyDomain: () => shopifyDomain,
      });

      return createRequestHandler({
        build: {} as ServerBuild,
        getLoadContext: () => ({storefront}),
      });
    }

    it('forwards buy permalinks to the store domain with the query string unchanged', async () => {
      const response = await createBuyPermalinkHandler()(
        createDocumentRequest(
          'https://store.test/buy/123:2,~Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC80NTY:1?continue_to=/collections/all&buyer/email=buyer%40example.com',
        ),
      );

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe(
        'https://test-store.myshopify.com/buy/123:2,~Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC80NTY:1?continue_to=/collections/all&buyer/email=buyer%40example.com',
      );
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('referrer-policy')).toBe('no-referrer');
      expect(mockReactRouterHandler).not.toHaveBeenCalled();
    });

    it.each(['/buy', '/buy/', '/buy/123:1/'])(
      'lets the app handle %s',
      async (pathname) => {
        const response = await createBuyPermalinkHandler()(
          createDocumentRequest(`https://store.test${pathname}`),
        );

        expect(mockReactRouterHandler).toHaveBeenCalled();
        expect(await response.text()).toBe('ok');
      },
    );

    it('forwards mock.shop buy permalinks to the demo store', async () => {
      const response = await createBuyPermalinkHandler('https://mock.shop')(
        createDocumentRequest('https://store.test/buy/123:1'),
      );

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe(
        'https://demostore.mock.shop/buy/123:1',
      );
    });

    it.each(['HEAD', 'POST'])(
      'returns 405 for %s requests to buy permalinks',
      async (method) => {
        const response = await createBuyPermalinkHandler()(
          new Request('https://store.test/buy/123:1', {method}),
        );

        expect(response.status).toBe(405);
        expect(mockReactRouterHandler).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        '?continue_to=/collections/all&buyer/email=buyer%40example.com&_routes=routes%2F%24',
        '?continue_to=/collections/all&buyer/email=buyer%40example.com',
      ],
      [
        '?_routes=routes%2F%24&continue_to=%2fcollections%2fall&_routes&buyer/name=A%20B+~&tag=a&tag=b&flag&blank=',
        '?continue_to=%2fcollections%2fall&buyer/name=A%20B+~&tag=a&tag=b&flag&blank=',
      ],
      [
        '?%5Froutes=routes%2F%24&_routes_extra=keep&bad%=value',
        '?_routes_extra=keep&bad%=value',
      ],
      ['?continue_to=/collections/all', '?continue_to=/collections/all'],
      ['?_routes=routes%2F%24&_routes', ''],
    ])(
      'reloads buy permalinks without rewriting query bytes in %s',
      async (search, documentSearch) => {
        const response = await createBuyPermalinkHandler()(
          new Request(`https://store.test/buy/123:1.data${search}`),
        );

        expect(response.status).toBe(204);
        expect(response.headers.get('X-Remix-Redirect')).toBe(
          `/buy/123:1${documentSearch}`,
        );
        expect(response.headers.get('X-Remix-Reload-Document')).toBe('true');
        expect(mockReactRouterHandler).not.toHaveBeenCalled();
      },
    );
  });
});
