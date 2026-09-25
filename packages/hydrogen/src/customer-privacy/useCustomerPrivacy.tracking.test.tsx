import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest';
import {renderHook, act, waitFor, cleanup} from '@testing-library/react';
// @ts-ignore - worktop/cookie types not properly exported
import {parse} from 'worktop/cookie';
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

/**
 * A minimal cookie jar mock: seeded cookies stay readable, and every write
 * is captured so expiry writes can be asserted.
 */
function mockCookieJar() {
  const jar = new Map<string, string>();
  const writes: string[] = [];

  const seedLegacyCookies = () => {
    jar.set('_shopify_y', 'legacy-unique');
    jar.set('_shopify_s', 'legacy-visit');
  };

  vi.spyOn(document, 'cookie', 'get').mockImplementation(() =>
    [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; '),
  );
  vi.spyOn(document, 'cookie', 'set').mockImplementation(
    (cookieString: string) => {
      writes.push(cookieString);
      const {maxage, ...cookieKeyValuePair} = parse(cookieString);
      const cookieName = Object.keys(cookieKeyValuePair)[0];
      if (maxage) {
        jar.set(cookieName, cookieKeyValuePair[cookieName]);
      } else {
        jar.delete(cookieName);
      }
    },
  );

  return {jar, writes, seedLegacyCookies};
}

function expiryWriteNames(writes: string[]): string[] {
  return writes
    .map((write) => {
      const {maxage, ...cookieKeyValuePair} = parse(write);
      const [cookieName] = Object.keys(cookieKeyValuePair);
      return maxage === 0 ? cookieName : undefined;
    })
    .filter((name): name is string => Boolean(name));
}

function simulateConsentScriptRequestValues(uniqueToken: string) {
  // The consent script caches tokens from its own request on the same
  // Customer Privacy API object, before dispatching visitorConsentCollected:
  getCustomerPrivacyCache().cachedToken = {
    _shopify_y: uniqueToken,
    _shopify_y_expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000,
  };
  document.dispatchEvent(
    new CustomEvent('visitorConsentCollected', {detail: {}}),
  );
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
    // Vitest runs with `globals: false`, so testing-library's automatic
    // cleanup does not register: unmount explicitly, otherwise every hook
    // rendered by an earlier test keeps its document listeners alive and
    // consent events leak between tests.
    cleanup();
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

  it('publishes the declined consent value but no tokens when the response reports no consent', async () => {
    // A declined store still returns its consent value: it encodes the
    // declined state and is how the Customer Privacy API learns it. The
    // tokens are the backend's no-consent signal: null.
    const fetchMock = mockConsentFetch({
      data: {
        consentManagement: {
          cookies: {
            trackingConsentCookie: 'declined-consent-value',
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
    expect(cachedConsent).toBe('declined-consent-value');
  });

  it('publishes nothing when the response carries no values at all', async () => {
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

  describe('deprecated cookie removal', () => {
    it('removes deprecated cookies once the published values are in place', async () => {
      const fetchMock = mockConsentFetch();
      const {writes, seedLegacyCookies} = mockCookieJar();
      seedLegacyCookies();

      const props = {...PROPS, sameDomainForStorefrontApi: true};
      const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
        initialProps: props,
      });

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      // The consent script loads with an empty token cache; the published
      // body values are the only replacement values in place:
      simulateCdnConsentApiLoad();
      rerender(props);

      await act(async () => {});

      // Session migration happened on the consent request (its cookie header
      // carried the legacy values), so the legacy cookies are expired now:
      expect(expiryWriteNames(writes).sort()).toEqual([
        '_shopify_s',
        '_shopify_y',
      ]);
    });

    it('removes deprecated cookies when the consent script request provided the unique token', async () => {
      // Hydrogen's consent fetch fails, but the script's own request already
      // cached the replacement unique token:
      const fetchMock = mockConsentFetchFailure();
      const {writes, seedLegacyCookies} = mockCookieJar();
      seedLegacyCookies();

      const props = {...PROPS, sameDomainForStorefrontApi: true};
      const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
        initialProps: props,
      });

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      simulateCdnConsentApiLoad({
        cachedToken: {
          _shopify_y: 'script-unique',
          _shopify_y_expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000,
        },
      });
      rerender(props);

      await act(async () => {});

      expect(expiryWriteNames(writes).sort()).toEqual([
        '_shopify_s',
        '_shopify_y',
      ]);
    });

    it('removes deprecated cookies when the consent script reports values after the page loaded', async () => {
      // Both the fetch and the script's request are still in flight when the
      // APIs load; the script's request completes later:
      const fetchMock = mockConsentFetchFailure();
      const {writes, seedLegacyCookies} = mockCookieJar();
      seedLegacyCookies();

      const props = {...PROPS, sameDomainForStorefrontApi: true};
      const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
        initialProps: props,
      });

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      simulateCdnConsentApiLoad();
      rerender(props);
      await act(async () => {});

      // Nothing replaced the legacy values yet, so they must be kept:
      expect(expiryWriteNames(writes)).toEqual([]);

      simulateConsentScriptRequestValues('script-unique');
      await act(async () => {});

      expect(expiryWriteNames(writes).sort()).toEqual([
        '_shopify_s',
        '_shopify_y',
      ]);
    });

    it('keeps deprecated cookies when both the consent fetch and the script request failed', async () => {
      // Double failure: no replacement values exist anywhere, so deleting
      // the legacy cookies would orphan the visitor's session:
      const fetchMock = mockConsentFetchFailure();
      const {jar, writes, seedLegacyCookies} = mockCookieJar();
      seedLegacyCookies();

      const props = {...PROPS, sameDomainForStorefrontApi: true};
      const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
        initialProps: props,
      });

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // The script's request also produced no values (empty cache):
      simulateCdnConsentApiLoad();
      rerender(props);
      await act(async () => {});

      // Even a consent event cannot expire the cookies without the unique
      // token in place — the safety gate holds:
      document.dispatchEvent(
        new CustomEvent('visitorConsentCollected', {detail: {}}),
      );
      await act(async () => {});

      expect(expiryWriteNames(writes)).toEqual([]);
      expect(jar.get('_shopify_y')).toBe('legacy-unique');
      expect(jar.get('_shopify_s')).toBe('legacy-visit');
    });

    it('keeps deprecated cookies when the consent response reports no consent', async () => {
      // The backend's no-consent signal: no replacement values exist, so
      // the legacy cookies stay until the no-consent clear path removes them:
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
      const {jar, writes, seedLegacyCookies} = mockCookieJar();
      seedLegacyCookies();

      const props = {...PROPS, sameDomainForStorefrontApi: true};
      const {rerender} = renderHook((p) => useCustomerPrivacy(p), {
        initialProps: props,
      });

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      simulateCdnConsentApiLoad();
      rerender(props);
      await act(async () => {});

      expect(expiryWriteNames(writes)).toEqual([]);
      expect(jar.get('_shopify_y')).toBe('legacy-unique');
      expect(jar.get('_shopify_s')).toBe('legacy-visit');
    });
  });
});
