import {describe, it, expect, vi} from 'vitest';
import {handleProxyStandardRoutes} from './handleProxyStandardRoutes';

describe('handleProxyStandardRoutes', () => {
  it('returns the proxied response when the storefront marks the request as proxied', async () => {
    const response = new Response('proxied');
    const storefront = {
      isStorefrontApiUrl: vi.fn(() => true),
      forward: vi.fn(async () => response),
    };
    const request = new Request('https://example.com/api/2026-01/graphql.json');

    const proxyResponse = await handleProxyStandardRoutes({
      request,
      storefront,
    });

    expect(proxyResponse).toBe(response);
    expect(storefront.isStorefrontApiUrl).toHaveBeenCalledWith(request);
    expect(storefront.forward).toHaveBeenCalledWith(request);
  });

  it('returns undefined when the route is not proxied', () => {
    const storefront = {
      isStorefrontApiUrl: vi.fn(() => false),
      forward: vi.fn(),
    };
    const request = new Request('https://example.com/products/widget');

    const proxyResponse = handleProxyStandardRoutes({
      request,
      storefront,
    });

    expect(proxyResponse).toBeUndefined();
    expect(storefront.isStorefrontApiUrl).toHaveBeenCalledWith(request);
    expect(storefront.forward).not.toHaveBeenCalled();
  });
});
