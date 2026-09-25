import {vi, afterEach, describe, expect, it} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useShopifyCookies} from './useShopifyCookies.js';
import {expireDeprecatedCookies} from './cookies-utils.js';
import {
  cachedTrackingValues,
  type ConsentFetchResult,
} from './tracking-utils.js';
// @ts-ignore - worktop/cookie types not properly exported
import {parse} from 'worktop/cookie';

type MockCookieJar = Record<
  string,
  {
    maxage: number | undefined;
    samesite: string | undefined;
    path: string | undefined;
    domain: string | undefined;
    value: string;
  }
>;

function mockCookie(): {jar: MockCookieJar; writes: string[]} {
  const cookieJar: MockCookieJar = {};
  const writes: string[] = [];

  vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
    let docCookie = '';
    Object.keys(cookieJar).forEach((key: string) => {
      docCookie += `${key}=${cookieJar[key].value};`;
    });
    return docCookie;
  });

  vi.spyOn(document, 'cookie', 'set').mockImplementation(
    (cookieString: string) => {
      writes.push(cookieString);
      const {domain, maxage, path, samesite, ...cookieKeyValuePair} =
        parse(cookieString);
      const cookieName = Object.keys(cookieKeyValuePair)[0];

      if (maxage) {
        cookieJar[cookieName] = {
          value: cookieKeyValuePair[cookieName],
          maxage,
          path,
          samesite,
          domain,
        };
      } else {
        delete cookieJar[cookieName];
      }
    },
  );
  return {jar: cookieJar, writes};
}

const consentBody = {
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

const noConsentBody = {
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
};

function createResponse(body: unknown = consentBody, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function mockFetch(responses: Response[] = [createResponse()]) {
  const fetchMock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(responses.shift()));

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function fetchCallArgs(
  fetchMock: ReturnType<typeof mockFetch>,
  callIndex: number,
) {
  const [url, init] = fetchMock.mock.calls[callIndex] as unknown as [
    string,
    RequestInit,
  ];
  return {url, init, headers: init.headers as Record<string, string>};
}

const originalLocation = window.location;

describe(`useShopifyCookies`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    cachedTrackingValues.current = null;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });

  it('never sets deprecated cookies, even with consent and tracking values available', () => {
    const {jar, writes} = mockCookie();
    cachedTrackingValues.current = {
      uniqueToken: 'tracked-unique',
      visitToken: 'tracked-visit',
      consent: 'tracked-consent',
    };

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    // No write happens at all when consent is granted:
    expect(writes).toEqual([]);
    expect(Object.keys(jar).length).toBe(0);
  });

  it('leaves existing legacy cookies untouched when consent is granted', () => {
    const {jar, writes} = mockCookie();
    document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';
    document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';
    writes.length = 0;

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    expect(writes).toEqual([]);
    expect(Object.keys(jar).length).toBe(2);
    expect(document.cookie).toContain('_shopify_s=legacy-visit');
    expect(document.cookie).toContain('_shopify_y=legacy-unique');
  });

  it('clears deprecated cookies when consent is not granted', () => {
    const {jar} = mockCookie();
    document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';
    document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: false}));

    expect(Object.keys(jar).length).toBe(0);
    expect(document.cookie).toBe('');
  });

  it('writes the clear cookies with a leading-dot domain and max-age 0', () => {
    const {writes} = mockCookie();
    document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';
    document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';
    writes.length = 0;

    renderHook(() =>
      useShopifyCookies({hasUserConsent: false, domain: 'myshop.com'}),
    );

    expect(writes.length).toBe(2);
    for (const write of writes) {
      const {domain, maxage, ...cookieKeyValuePair} = parse(write);
      expect(maxage).toBe(0);
      expect(domain).toBe('.myshop.com');
      // Empty value removes the cookie:
      const [cookieName, cookieValue] = Object.entries(cookieKeyValuePair).find(
        ([key]) => key === '_shopify_y' || key === '_shopify_s',
      )!;
      expect(cookieName).toMatch(/^_shopify_[ys]$/);
      expect(cookieValue).toBe('');
    }
  });

  it('scopes the clear domain to the common domain shared with the checkout domain', () => {
    const {writes} = mockCookie();
    Object.defineProperty(window, 'location', {
      value: {host: 'shop.myshop.com'},
      configurable: true,
    });
    document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';
    document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';
    writes.length = 0;

    renderHook(() =>
      useShopifyCookies({
        hasUserConsent: false,
        checkoutDomain: 'checkout.myshop.com',
      }),
    );

    // Only the common suffix of the storefront and checkout hosts is used,
    // so cookies set for the shop domain (and its subdomains) are covered:
    expect(writes.length).toBe(2);
    for (const write of writes) {
      const {domain} = parse(write);
      expect(domain).toBe('.myshop.com');
    }
  });

  it('clears host-only cookies when the storefront runs on localhost', () => {
    const {writes} = mockCookie();
    Object.defineProperty(window, 'location', {
      value: {host: 'localhost:3000'},
      configurable: true,
    });
    document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';
    document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';
    writes.length = 0;

    renderHook(() => useShopifyCookies({hasUserConsent: false}));

    // A Domain attribute would not match a dev localhost host, so the clear
    // must be host-only:
    expect(writes.length).toBe(2);
    for (const write of writes) {
      const {domain} = parse(write);
      expect(domain).toBeUndefined();
    }
  });

  it('does not clear cookies when ignoreDeprecatedCookies is true', () => {
    const {jar, writes} = mockCookie();
    document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';
    document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';
    writes.length = 0;

    renderHook(() =>
      useShopifyCookies({hasUserConsent: false, ignoreDeprecatedCookies: true}),
    );

    expect(writes).toEqual([]);
    expect(Object.keys(jar).length).toBe(2);
  });

  describe('fetchTrackingValues', () => {
    it('requests the tracking values in the consentManagement response body', async () => {
      const fetchMock = mockFetch();

      renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true, hasUserConsent: true}),
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const {url, init, headers} = fetchCallArgs(fetchMock, 0);

      expect(url).toMatch(/\/api\/unstable\/graphql\.json$/);
      expect(String(init.body)).toContain('consentManagement');
      expect(String(init.body)).toContain('shopifyUnique');
      expect(String(init.body)).toContain('shopifyVisit');
      expect(String(init.body)).toContain('trackingConsentCookie');
      expect(String(init.body)).toContain('cookieDomain');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('sends the consent management marker header only on the same-origin request', async () => {
      const fetchMock = mockFetch([
        createResponse(undefined, false),
        createResponse(),
      ]);

      renderHook(() =>
        useShopifyCookies({
          fetchTrackingValues: true,
          checkoutDomain: 'checkout.myshop.com',
          hasUserConsent: true,
        }),
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const sameOrigin = fetchCallArgs(fetchMock, 0);
      // The marker triggers server-side migration of deprecated cookies
      // and must not leak to the cross-origin checkout retry:
      expect(sameOrigin.headers['Shopify-Storefront-Consent-Management']).toBe(
        '1',
      );
      expect(sameOrigin.url).not.toContain('checkout.myshop.com');

      const crossOrigin = fetchCallArgs(fetchMock, 1);
      expect(
        crossOrigin.headers['Shopify-Storefront-Consent-Management'],
      ).toBeUndefined();
      expect(crossOrigin.url).toContain('checkout.myshop.com');
    });

    it('sends the current token values as request headers', async () => {
      const fetchMock = mockFetch();
      cachedTrackingValues.current = {
        uniqueToken: 'current-unique',
        visitToken: 'current-visit',
      };

      renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true, hasUserConsent: true}),
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const {headers} = fetchCallArgs(fetchMock, 0);
      expect(headers['X-Shopify-UniqueToken']).toBe('current-unique');
      expect(headers['X-Shopify-VisitToken']).toBe('current-visit');
    });

    it('caches the tracking values from the response body', async () => {
      const fetchMock = mockFetch();

      renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true, hasUserConsent: true}),
      );

      await waitFor(() =>
        expect(cachedTrackingValues.current).toEqual({
          uniqueToken: 'body-unique',
          visitToken: 'body-visit',
          consent: 'body-consent',
        }),
      );
    });

    it('drops cached values when the body reports no tokens', async () => {
      const fetchMock = mockFetch([
        createResponse({
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
        }),
      ]);
      cachedTrackingValues.current = {
        uniqueToken: 'old-unique',
        visitToken: 'old-visit',
        consent: 'old-consent',
      };

      renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true, hasUserConsent: true}),
      );

      await waitFor(() => expect(cachedTrackingValues.current).toEqual({}));
    });

    it('resolves cookies as ready even when the fetch fails without a checkout domain', async () => {
      const fetchMock = mockFetch([createResponse(undefined, false)]);
      const {result} = renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true, hasUserConsent: true}),
      );

      // Degraded tracking is better than blocking the app:
      await waitFor(() => expect(result.current).toBe(true));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('consentResultRef', () => {
    function createConsentResultRef() {
      return {current: null as ConsentFetchResult | null};
    }

    it('receives the response body values, including the no-consent null signal', async () => {
      const fetchMock = mockFetch([createResponse(noConsentBody)]);
      const consentResultRef = createConsentResultRef();

      renderHook(() =>
        useShopifyCookies({
          fetchTrackingValues: true,
          hasUserConsent: true,
          consentResultRef,
        }),
      );

      await waitFor(() =>
        expect(consentResultRef.current).toEqual({
          status: 'succeeded',
          values: {
            uniqueToken: null,
            visitToken: null,
            consent: null,
          },
        }),
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('receives the retry values when the same-origin attempt fails', async () => {
      const fetchMock = mockFetch([
        createResponse(undefined, false),
        createResponse(),
      ]);
      const consentResultRef = createConsentResultRef();

      renderHook(() =>
        useShopifyCookies({
          fetchTrackingValues: true,
          checkoutDomain: 'checkout.myshop.com',
          hasUserConsent: true,
          consentResultRef,
        }),
      );

      await waitFor(() =>
        expect(consentResultRef.current).toEqual({
          status: 'succeeded',
          values: {
            uniqueToken: 'body-unique',
            visitToken: 'body-visit',
            consent: 'body-consent',
          },
        }),
      );
    });

    it('reports failure when both attempts fail', async () => {
      mockFetch([
        createResponse(undefined, false),
        createResponse(undefined, false),
      ]);
      const consentResultRef = createConsentResultRef();

      renderHook(() =>
        useShopifyCookies({
          fetchTrackingValues: true,
          checkoutDomain: 'checkout.myshop.com',
          hasUserConsent: true,
          consentResultRef,
        }),
      );

      await waitFor(() =>
        expect(consentResultRef.current).toEqual({status: 'failed'}),
      );
    });

    it('stays untouched when no consent fetch is requested', async () => {
      const consentResultRef = createConsentResultRef();

      renderHook(() =>
        useShopifyCookies({hasUserConsent: true, consentResultRef}),
      );

      await waitFor(() => expect(consentResultRef.current).toBeNull());
    });
  });

  describe('expireDeprecatedCookies', () => {
    it('expires both deprecated cookies on the current host by default', () => {
      const {writes} = mockCookie();

      expireDeprecatedCookies();

      expect(writes.length).toBe(2);
      for (const write of writes) {
        const {maxage, ...cookieKeyValuePair} = parse(write);
        const [cookieName, cookieValue] = Object.entries(
          cookieKeyValuePair,
        ).find(([key]) => key === '_shopify_y' || key === '_shopify_s')!;
        expect(maxage).toBe(0);
        expect(cookieValue).toBe('');
        expect(cookieName).toMatch(/^_shopify_[ys]$/);
      }
    });

    it('scopes the expiry domain to the domain shared with the checkout domain', () => {
      const {writes} = mockCookie();
      Object.defineProperty(window, 'location', {
        value: {host: 'shop.myshop.com'},
        configurable: true,
      });

      expireDeprecatedCookies({checkoutDomain: 'checkout.myshop.com'});

      expect(writes.length).toBe(2);
      for (const write of writes) {
        const {domain, maxage} = parse(write);
        expect(domain).toBe('.myshop.com');
        expect(maxage).toBe(0);
      }
    });
  });
});
