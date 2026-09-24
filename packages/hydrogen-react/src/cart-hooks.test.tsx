import {vi, afterEach, describe, expect, it} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {ShopifyProvider} from './ShopifyProvider.js';
import {getShopifyConfig} from './ShopifyProvider.test.js';
import {useCartFetch} from './cart-hooks.js';
import {
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
} from './cart-constants.js';
import {
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
  cachedTrackingValues,
} from './tracking-utils.js';

type TokenGetterOptions = {generateFallback?: boolean; tag?: string};

/**
 * Installs the consent-tracking-api token getters on the window as spies, so
 * tests can assert how every read was performed.
 */
function stubCustomerPrivacyTokenGetters() {
  const uniqueTokenGetter = vi.fn(
    (_options?: TokenGetterOptions) => 'cta-unique',
  );
  const visitTokenGetter = vi.fn(
    (_options?: TokenGetterOptions) => 'cta-visit',
  );

  (window as {Shopify?: unknown}).Shopify = {
    customerPrivacy: {
      __internal: {
        uniqueToken: uniqueTokenGetter,
        visitToken: visitTokenGetter,
      },
    },
  };

  return {uniqueTokenGetter, visitTokenGetter};
}

function renderCartFetchHook() {
  return renderHook(() => useCartFetch(), {
    wrapper: ({children}) => (
      <ShopifyProvider
        {...getShopifyConfig()}
        sameDomainForStorefrontApi={false}
      >
        {children}
      </ShopifyProvider>
    ),
  });
}

describe('useCartFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as {Shopify?: unknown}).Shopify;
    cachedTrackingValues.current = null;
  });

  it('reads tokens through the Customer Privacy API getters on every cart fetch, never requesting fallback generation', async () => {
    const {uniqueTokenGetter, visitTokenGetter} =
      stubCustomerPrivacyTokenGetters();

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({data: {}}),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const {result} = renderCartFetchHook();

    // Call the fetcher repeatedly: every read must keep the same discipline.
    await result.current({query: 'query cart {}', variables: {}});
    await result.current({query: 'query cart {}', variables: {}});

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(uniqueTokenGetter.mock.calls.length).toBeGreaterThan(0);
    expect(visitTokenGetter.mock.calls.length).toBeGreaterThan(0);
    for (const call of uniqueTokenGetter.mock.calls) {
      expect(call[0]).toEqual({
        generateFallback: false,
        tag: 'hydrogen:classic',
      });
    }
    for (const call of visitTokenGetter.mock.calls) {
      expect(call[0]).toEqual({
        generateFallback: false,
        tag: 'hydrogen:classic',
      });
    }

    // Cross-domain cart mutations still carry the token values as headers:
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers[SHOPIFY_STOREFRONT_Y_HEADER]).toBe('cta-unique');
    expect(headers[SHOPIFY_STOREFRONT_S_HEADER]).toBe('cta-visit');
    expect(headers[SHOPIFY_UNIQUE_TOKEN_HEADER]).toBe('cta-unique');
    expect(headers[SHOPIFY_VISIT_TOKEN_HEADER]).toBe('cta-visit');
  });
});
