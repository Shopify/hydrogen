import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest';
import {renderHook, act, waitFor} from '@testing-library/react';
import {
  useCustomerPrivacy,
  getCustomerPrivacy,
} from './ShopifyCustomerPrivacy.js';

const revalidateMock = vi.fn<() => Promise<void>>(() => Promise.resolve());

vi.mock('react-router', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('react-router');

  return {
    ...actual,
    useRevalidator: () => ({
      revalidate: revalidateMock,
      state: 'idle',
    }),
  };
});

const PROPS = {
  checkoutDomain: 'checkout.shopify.com',
  storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
  withPrivacyBanner: false,
};

const CONSENT_RESPONSE_BODY = {
  data: {
    consentManagement: {
      cookies: {
        trackingConsentCookie: 'body-consent',
        cookieDomain: 'shop.example',
        shopifyUnique: 'body-unique',
        shopifyVisit: 'body-visit',
      },
    },
  },
};

function mockConsentFetch(body: unknown = CONSENT_RESPONSE_BODY) {
  const fetchMock = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(body),
    } as unknown as Response),
  );

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mockConsentFetchFailure() {
  const fetchMock = vi.fn().mockRejectedValue(new Error('network offline'));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * Simulates how the consent CDN script loads: it resets `window.Shopify` to
 * an empty object, then assigns the full API while spreading any values
 * already present on `window.Shopify.customerPrivacy` (our pre-load stub).
 */
function simulateCdnConsentApiLoad(extraApi: Record<string, unknown> = {}) {
  const windowWithShopify = global.window as unknown as {
    Shopify?: Record<string, unknown>;
  };

  windowWithShopify.Shopify = {};
  windowWithShopify.Shopify.customerPrivacy = {
    ...(windowWithShopify.Shopify.customerPrivacy as object),
    setTrackingConsent: () => {},
    ...extraApi,
  };
}

function getCustomerPrivacyCache() {
  return getCustomerPrivacy() as unknown as {
    cachedToken?: Record<string, unknown>;
    cachedConsent?: string;
  };
}

describe('useCustomerPrivacy tracking values', () => {
  beforeEach(() => {
    revalidateMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.querySelectorAll('script').forEach((node) => node.remove());
    delete (global.window as any).Shopify;
    delete (global.window as any).privacyBanner;
  });

  it('fetches consent values whenever the SFAPI proxy is detected', async () => {
    const fetchMock = mockConsentFetch();

    renderHook(() =>
      useCustomerPrivacy({...PROPS, sameDomainForStorefrontApi: true}),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(init.body)).toContain('consentManagement');
    expect(String(init.body)).toContain('shopifyUnique');
    expect(String(init.body)).toContain('shopifyVisit');
  });

  it('does not fetch when the SFAPI proxy is not detected', async () => {
    const fetchMock = mockConsentFetch();

    renderHook(() => useCustomerPrivacy(PROPS));

    await act(async () => {});

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('installs the internal diagnostic metadata in the pre-load stub', () => {
    renderHook(() => useCustomerPrivacy(PROPS));

    // Simulate the CDN's `window.Shopify = window.Shopify ? ... : {}` reset:
    simulateCdnConsentApiLoad();

    const stub = (global.window as {Shopify?: {customerPrivacy?: unknown}})
      .Shopify?.customerPrivacy as {
      backendConsentEnabled?: boolean;
      config?: {debug?: {hydrogen?: unknown}};
    };

    expect(stub.backendConsentEnabled).toBe(true);
    expect(stub.config?.debug?.hydrogen).toEqual({
      generation: 2,
      serverTiming: false,
    });
  });

  it('keeps the diagnostic metadata after the CDN assigns the full API', () => {
    const {rerender} = renderHook((props) => useCustomerPrivacy(props), {
      initialProps: PROPS,
    });

    simulateCdnConsentApiLoad();
    rerender(PROPS);

    expect(getCustomerPrivacy()).not.toBeNull();

    const config = (getCustomerPrivacy() as unknown as {config?: unknown})
      .config as {debug?: {hydrogen?: unknown}};

    expect(config?.debug?.hydrogen).toEqual({
      generation: 2,
      serverTiming: false,
    });
  });

  it('publishes the consent body values before the banner loads and onReady fires', async () => {
    const fetchMock = mockConsentFetch();

    let tokenWhenLoadBanner: unknown = 'not-called';
    let tokenWhenOnReady: unknown = 'not-called';

    const props = {
      ...PROPS,
      withPrivacyBanner: true,
      sameDomainForStorefrontApi: true,
      onReady: () => {
        tokenWhenOnReady = getCustomerPrivacyCache().cachedToken?._shopify_y;
      },
    };

    const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
      initialProps: props,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    simulateCdnConsentApiLoad();
    rerender(props);

    const windowWithBanner = global.window as unknown as {
      privacyBanner?: unknown;
    };
    windowWithBanner.privacyBanner = {
      loadBanner: () => {
        tokenWhenLoadBanner = getCustomerPrivacyCache().cachedToken?._shopify_y;
      },
      showPreferences: () => {},
    };
    rerender(props);

    await act(async () => {});

    // The values must be published before any consumer reads them:
    expect(tokenWhenLoadBanner).toBe('body-unique');
    expect(tokenWhenOnReady).toBe('body-unique');

    const {cachedToken, cachedConsent} = getCustomerPrivacyCache();
    expect(cachedToken?._shopify_y).toBe('body-unique');
    expect(cachedToken?._shopify_s).toBe('body-visit');
    expect(cachedConsent).toBe('body-consent');

    // Sibling expiry keys, matching the consent API's token cache shape:
    expect(cachedToken?._shopify_y_expires_at).toBeGreaterThan(Date.now());
    expect(cachedToken?._shopify_s_expires_at).toBeGreaterThan(Date.now());
  });

  it('does not overwrite token values the Customer Privacy API already holds', async () => {
    const fetchMock = mockConsentFetch();

    const props = {...PROPS, sameDomainForStorefrontApi: true};
    const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
      initialProps: props,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const ONE_YEAR_FROM_NOW_MS = Date.now() + 365 * 24 * 60 * 60 * 1000;
    simulateCdnConsentApiLoad({
      cachedToken: {
        _shopify_y: 'cta-unique',
        _shopify_y_expires_at: ONE_YEAR_FROM_NOW_MS,
      },
    });
    rerender(props);

    await act(async () => {});

    const {cachedToken} = getCustomerPrivacyCache();
    // Existing value kept, missing value filled from the consent body:
    expect(cachedToken?._shopify_y).toBe('cta-unique');
    expect(cachedToken?._shopify_s).toBe('body-visit');
  });

  it('publishes nothing when the consent response reports no tokens', async () => {
    const fetchMock = mockConsentFetch({
      data: {
        consentManagement: {
          cookies: {
            trackingConsentCookie: null,
            cookieDomain: 'shop.example',
            shopifyUnique: null,
            shopifyVisit: null,
          },
        },
      },
    });

    const props = {...PROPS, sameDomainForStorefrontApi: true};
    const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
      initialProps: props,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    simulateCdnConsentApiLoad();
    rerender(props);

    await act(async () => {});

    const {cachedToken, cachedConsent} = getCustomerPrivacyCache();
    expect(cachedToken).toBeUndefined();
    expect(cachedConsent).toBeUndefined();
  });

  it('publishes the fresh body values, not stale deprecated-cookie values', async () => {
    const fetchMock = mockConsentFetch();

    // A visitor upgrading from an older storefront still carries deprecated
    // cookies with old values; the fresh consent body must win:
    const cookieSpy = vi
      .spyOn(document, 'cookie', 'get')
      .mockReturnValue(
        '_shopify_y=stale-unique; _shopify_s=stale-visit; _tracking_consent=stale-consent',
      );

    const props = {...PROPS, sameDomainForStorefrontApi: true};
    const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
      initialProps: props,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    simulateCdnConsentApiLoad();
    rerender(props);

    await act(async () => {});

    cookieSpy.mockRestore();

    const {cachedToken, cachedConsent} = getCustomerPrivacyCache();
    expect(cachedToken?._shopify_y).toBe('body-unique');
    expect(cachedToken?._shopify_s).toBe('body-visit');
    expect(cachedConsent).toBe('body-consent');
  });

  it('publishes nothing when the consent fetch failed, even with deprecated cookies present', async () => {
    const fetchMock = mockConsentFetchFailure();

    // The same-origin consent fetch fails. `useCustomerPrivacy` does not
    // opt into the cross-origin `checkoutDomain` retry (that option exists
    // for direct `useShopifyCookies` callers without the built-in wiring),
    // so a single attempt is expected:
    vi.spyOn(document, 'cookie', 'get').mockReturnValue(
      '_shopify_y=stale-unique; _shopify_s=stale-visit',
    );

    const props = {...PROPS, sameDomainForStorefrontApi: true};
    const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
      initialProps: props,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // The script's own request also produced no values (empty cache):
    simulateCdnConsentApiLoad();
    rerender(props);

    await act(async () => {});

    // Stale cookie values must not leak into the Customer Privacy API:
    const {cachedToken, cachedConsent} = getCustomerPrivacyCache();
    expect(cachedToken).toBeUndefined();
    expect(cachedConsent).toBeUndefined();
  });
});
