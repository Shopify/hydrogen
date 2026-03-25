import {vi, describe, it, expect, beforeEach} from 'vitest';
import {hydrogenServerRoutes} from './server-routes';
import type {Storefront, I18nBase} from './storefront';

function createMockStorefront(
  forwardImpl: Storefront<I18nBase>['forward'] = vi.fn(() =>
    Promise.resolve(new Response('OK', {status: 200})),
  ),
) {
  return {forward: forwardImpl} as unknown as Storefront<I18nBase>;
}

describe('hydrogenServerRoutes', () => {
  let forwardMock: ReturnType<typeof vi.fn>;
  let storefront: Storefront<I18nBase>;

  beforeEach(() => {
    forwardMock = vi.fn(() =>
      Promise.resolve(new Response('OK', {status: 200})),
    );
    storefront = createMockStorefront(forwardMock);
  });

  describe('SFAPI proxy', () => {
    it('forwards a standard SFAPI path with the correct version', async () => {
      const request = new Request('http://localhost/api/2024-10/graphql.json', {
        method: 'POST',
        body: '{"query":"{ shop { name } }"}',
      });

      const response = await hydrogenServerRoutes(request, {storefront});

      expect(forwardMock).toHaveBeenCalledWith(request, {
        storefrontApiVersion: '2024-10',
      });
      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);
    });

    it('matches when mounted at an arbitrary prefix', async () => {
      const request = new Request(
        'http://localhost/shopify/api/2024-10/graphql.json',
        {method: 'POST'},
      );

      await hydrogenServerRoutes(request, {storefront});

      expect(forwardMock).toHaveBeenCalledWith(request, {
        storefrontApiVersion: '2024-10',
      });
    });

    it('matches the unstable version', async () => {
      const request = new Request(
        'http://localhost/api/unstable/graphql.json',
        {method: 'POST'},
      );

      await hydrogenServerRoutes(request, {storefront});

      expect(forwardMock).toHaveBeenCalledWith(request, {
        storefrontApiVersion: 'unstable',
      });
    });

    it('matches with a deep mount prefix', async () => {
      const request = new Request(
        'http://localhost/api/hydrogen/v1/api/2025-01/graphql.json',
        {method: 'POST'},
      );

      await hydrogenServerRoutes(request, {storefront});

      expect(forwardMock).toHaveBeenCalledWith(request, {
        storefrontApiVersion: '2025-01',
      });
    });

    it('passes the request through as-is (including body)', async () => {
      const body =
        '{"query":"{ products(first: 10) { edges { node { id } } } }"}';
      const request = new Request('http://localhost/api/2024-10/graphql.json', {
        method: 'POST',
        body,
      });

      await hydrogenServerRoutes(request, {storefront});

      const passedRequest = forwardMock.mock.calls[0][0] as Request;
      expect(passedRequest).toBe(request);
    });
  });

  describe('unmatched routes', () => {
    it('returns null for non-graphql SFAPI paths', async () => {
      const request = new Request('http://localhost/api/2024-10/products.json');

      const response = await hydrogenServerRoutes(request, {storefront});

      expect(response).toBeNull();
      expect(forwardMock).not.toHaveBeenCalled();
    });

    it('returns null for unrelated paths', async () => {
      const request = new Request('http://localhost/checkout');

      const response = await hydrogenServerRoutes(request, {storefront});

      expect(response).toBeNull();
      expect(forwardMock).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns 502 Bad Gateway on network failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const networkError = new TypeError('fetch failed');
      const failingStorefront = createMockStorefront(() => {
        throw networkError;
      });

      const request = new Request('http://localhost/api/2024-10/graphql.json', {
        method: 'POST',
      });

      const response = await hydrogenServerRoutes(request, {
        storefront: failingStorefront,
      });

      expect(response).not.toBeNull();
      expect(response!.status).toBe(502);
      expect(await response!.text()).toBe('Bad Gateway');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[h2:error:sfapi-proxy]',
        'Storefront API proxy error',
        networkError,
      );
      consoleErrorSpy.mockRestore();
    });

    it('returns 504 Gateway Timeout when AbortSignal.timeout fires', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const timeoutError = new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      );
      const timeoutStorefront = createMockStorefront(() => {
        throw timeoutError;
      });

      const request = new Request('http://localhost/api/2024-10/graphql.json', {
        method: 'POST',
      });

      const response = await hydrogenServerRoutes(request, {
        storefront: timeoutStorefront,
      });

      expect(response).not.toBeNull();
      expect(response!.status).toBe(504);
      expect(await response!.text()).toBe('Gateway Timeout');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[h2:error:sfapi-proxy]',
        'Storefront API request timed out',
        timeoutError,
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
