import {vi, describe, it, expect, beforeEach, afterEach} from 'vitest';
import {createStorefrontClient} from './storefront';
import {fetchWithServerCache} from './cache/server-fetch';
import {
  STOREFRONT_ACCESS_TOKEN_HEADER,
  STOREFRONT_REQUEST_GROUP_ID_HEADER,
  SHOPIFY_CLIENT_IP_HEADER,
  SHOPIFY_CLIENT_IP_SIG_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_STOREFRONT_ID_HEADER,
} from './constants';

vi.mock('./cache/server-fetch.ts', async () => {
  const original = await vi.importActual<typeof import('./cache/server-fetch')>(
    './cache/server-fetch.ts',
  );

  return {
    ...original,
    fetchWithServerCache: vi.fn(() =>
      Promise.resolve(['' as any, new Response('ok')]),
    ) as any,
  } satisfies typeof original;
});

describe('createStorefrontClient', () => {
  const storeDomain = 'domain';
  const storefrontId = 'id';
  const publicStorefrontToken = 'public-token';
  const privateStorefrontToken = 'private-token';
  const storefrontHeaders = {
    requestGroupId: '123',
    buyerIp: '::1',
    buyerIpSig: 'sig',
    purpose: 'test',
    cookie: '_shopify_y=123; other=456; _shopify_s=789',
  };

  describe('validation errors', () => {
    it('complains about missing token', async () => {
      expect(() =>
        createStorefrontClient({
          storeDomain,
          storefrontId,
        }),
      ).toThrow('Token');
    });

    it('fails when calling query or mutate with the wrong string', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      expect(() => storefront.query('mutation {}')).toThrow('execute');
      expect(() => storefront.mutate('query {}')).toThrow('execute');
    });
  });

  describe('headers', () => {
    it('uses private token if provided', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
        privateStorefrontToken,
      });

      await expect(storefront.query('query {}')).resolves.not.toThrow();
      expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
        headers: {
          'Shopify-Storefront-Private-Token': privateStorefrontToken,
        },
      });
    });

    it('fallsback to public token when private one is not provided', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      await expect(storefront.query('query {}')).resolves.not.toThrow();
      expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
        headers: {
          [STOREFRONT_ACCESS_TOKEN_HEADER]: publicStorefrontToken,
        },
      });
    });

    it('relays Shopify cookies', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      await expect(storefront.query('query {}')).resolves.not.toThrow();
      expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
        headers: {
          [SHOPIFY_STOREFRONT_Y_HEADER]: '123',
          [SHOPIFY_STOREFRONT_S_HEADER]: '789',
        },
      });
    });
  });

  it('adds i18n variables automatically if needed', async () => {
    const {storefront} = createStorefrontClient({
      storeDomain,
      storefrontId,
      storefrontHeaders,
      publicStorefrontToken,
      i18n: {language: 'EN', country: 'US'},
    });

    await expect(
      storefront.query('query Name($something: String) {}'),
    ).resolves.not.toThrow();

    expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
      body: expect.stringMatching('"variables":{}'),
    });

    await expect(
      storefront.query(
        'query Name($country: CountryCode, $language: LanguageCode) {}',
      ),
    ).resolves.not.toThrow();
    expect(vi.mocked(fetchWithServerCache).mock.lastCall?.[1]).toMatchObject({
      body: expect.stringMatching(
        '"variables":{"country":"US","language":"EN"}',
      ),
    });
  });

  describe('response errors', () => {
    it('throws when the response is not ok', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });

      vi.mocked(fetchWithServerCache).mockResolvedValueOnce([
        'my-error',
        new Response('not ok', {status: 500}),
      ]);

      await expect(storefront.query('query {}')).rejects.toThrowError(
        'my-error',
      );
    });

    it('does not throw when the response contains partial SFAPI errors', async () => {
      const {storefront} = createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
        logErrors: false,
      });

      vi.mocked(fetchWithServerCache).mockResolvedValueOnce([
        {
          data: {cart: {}},
          errors: [{message: 'first'}, {message: 'second'}],
        },
        new Response('ok', {status: 200}),
      ]);

      const data = await storefront.query('query {}');
      expect(data).toMatchObject({
        cart: {},
        errors: [
          {message: '[h2:error:storefront.query] first'},
          {message: '[h2:error:storefront.query] second'},
        ],
      });
    });
  });

  describe('forwardMcp', () => {
    let originalFetch: typeof globalThis.fetch;
    let mockFetch: ReturnType<typeof vi.fn>;

    function createClientWithMcp() {
      return createStorefrontClient({
        storeDomain,
        storefrontId,
        storefrontHeaders,
        publicStorefrontToken,
      });
    }

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      mockFetch = vi.fn().mockResolvedValue(new Response('ok', {status: 200}));
      globalThis.fetch = mockFetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('forwards request to {shopDomain}/api/mcp', async () => {
      const {storefront} = createClientWithMcp();

      const request = new Request('https://my-store.com/api/mcp', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({jsonrpc: '2.0', method: 'test', id: 1}),
      });

      await storefront.forwardMcp(request);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [calledUrl, calledInit] = mockFetch.mock.calls[0]!;
      expect(calledUrl).toContain('/api/mcp');
      expect(calledInit.method).toBe('POST');
    });

    it('includes request headers and server-side defaultHeaders', async () => {
      const {storefront} = createClientWithMcp();

      const request = new Request('https://my-store.com/api/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'user-agent': 'test-client',
        },
        body: '{}',
      });

      await storefront.forwardMcp(request);

      const forwardedHeaders = new Headers(mockFetch.mock.calls[0]![1].headers);

      expect(forwardedHeaders.get('content-type')).toBe('application/json');
      expect(forwardedHeaders.get('accept')).toBe('application/json');
      expect(forwardedHeaders.get('user-agent')).toBe('test-client');

      expect(forwardedHeaders.get(STOREFRONT_ACCESS_TOKEN_HEADER)).toBe(
        publicStorefrontToken,
      );
      expect(forwardedHeaders.get(SHOPIFY_CLIENT_IP_HEADER)).toBe(
        storefrontHeaders.buyerIp,
      );
      expect(forwardedHeaders.get(SHOPIFY_CLIENT_IP_SIG_HEADER)).toBe(
        storefrontHeaders.buyerIpSig,
      );
    });

    it('sets x-forwarded-for to buyer IP', async () => {
      const {storefront} = createClientWithMcp();

      const request = new Request('https://my-store.com/api/mcp', {
        method: 'POST',
        body: '{}',
      });

      await storefront.forwardMcp(request);

      const forwardedHeaders = new Headers(mockFetch.mock.calls[0]![1].headers);
      expect(forwardedHeaders.get('x-forwarded-for')).toBe(
        storefrontHeaders.buyerIp,
      );
    });

    it('forwards observability headers (request group ID and storefront ID)', async () => {
      const {storefront} = createClientWithMcp();

      const request = new Request('https://my-store.com/api/mcp', {
        method: 'POST',
        body: '{}',
      });

      await storefront.forwardMcp(request);

      const forwardedHeaders = new Headers(mockFetch.mock.calls[0]![1].headers);
      expect(forwardedHeaders.get(STOREFRONT_REQUEST_GROUP_ID_HEADER)).toBe(
        storefrontHeaders.requestGroupId,
      );
      expect(forwardedHeaders.get(SHOPIFY_STOREFRONT_ID_HEADER)).toBe(
        storefrontId,
      );
    });

    it('returns JSON-RPC error when upstream fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'));
      const {storefront} = createClientWithMcp();

      const request = new Request('https://my-store.com/api/mcp', {
        method: 'POST',
        body: '{}',
      });

      const response = await storefront.forwardMcp(request);

      expect(response.status).toBe(502);
      expect(response.headers.get('content-type')).toBe('application/json');

      const body = await response.json();
      expect(body).toEqual({
        jsonrpc: '2.0',
        error: {code: -32603, message: 'DNS resolution failed'},
        id: null,
      });
    });
  });
});
