import {vi, afterEach, describe, expect, it} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useShopifyCookies} from './useShopifyCookies.js';
import {getTrackingValues} from './tracking-utils.js';
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

describe(`useShopifyCookies`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([true, false, undefined])(
    'leaves legacy cookies to CTA regardless of hasUserConsent (%s)',
    (hasUserConsent) => {
      const {jar, writes} = mockCookie();
      document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';
      document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';
      writes.length = 0;

      renderHook(() => useShopifyCookies({hasUserConsent}));

      expect(writes).toEqual([]);
      expect(Object.keys(jar)).toHaveLength(2);
      expect(document.cookie).toContain('_shopify_y=legacy-unique');
      expect(document.cookie).toContain('_shopify_s=legacy-visit');
    },
  );

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
      // Identify same-origin consent requests without adding a custom header
      // to the cross-origin checkout retry.
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
      // On the first load after upgrading, the current values are the legacy
      // cookie values, so the session migrates:
      document.cookie = '_shopify_y=current-unique; Max-Age=1800;';
      document.cookie = '_shopify_s=current-visit; Max-Age=1800;';

      renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true, hasUserConsent: true}),
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const {headers} = fetchCallArgs(fetchMock, 0);
      expect(headers['X-Shopify-UniqueToken']).toBe('current-unique');
      expect(headers['X-Shopify-VisitToken']).toBe('current-visit');
    });

    it('does not retain the response body values for later reads', async () => {
      const fetchMock = mockFetch();
      document.cookie = '_shopify_y=legacy-unique; Max-Age=1800;';
      document.cookie = '_shopify_s=legacy-visit; Max-Age=1800;';

      renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true, hasUserConsent: true}),
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      // CTA owns browser tracking values. This standalone cookie refresh does
      // not populate its cache, so these reads still see legacy cookies.
      expect(getTrackingValues()).toEqual({
        uniqueToken: 'legacy-unique',
        visitToken: 'legacy-visit',
        consent: '',
      });
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

  it.each([
    ['tracking values', consentBody],
    ['no consent', noConsentBody],
  ])(
    'settles readiness when the response contains %s',
    async (_description, body) => {
      const fetchMock = mockFetch([createResponse(body)]);
      const {result} = renderHook(() =>
        useShopifyCookies({fetchTrackingValues: true}),
      );

      await waitFor(() => expect(result.current).toBe(true));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('settles readiness when both consent requests fail', async () => {
    const fetchMock = mockFetch([
      createResponse(undefined, false),
      createResponse(undefined, false),
    ]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const {result} = renderHook(() =>
      useShopifyCookies({
        fetchTrackingValues: true,
        checkoutDomain: 'checkout.myshop.com',
      }),
    );

    await waitFor(() => expect(result.current).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('is ready without a request when fetching is disabled', () => {
    const fetchMock = mockFetch();
    const {result} = renderHook(() => useShopifyCookies());

    expect(result.current).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
