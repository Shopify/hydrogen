import {vi, afterEach, describe, expect, it} from 'vitest';
import {renderHook} from '@testing-library/react';
import {getShopifyCookies} from './cookies-utils.js';
import {useShopifyCookies} from './useShopifyCookies.js';
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

function mockCookie(): MockCookieJar {
  const cookieJar: MockCookieJar = {};

  vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
    let docCookie = '';
    Object.keys(cookieJar).forEach((key: string) => {
      docCookie += `${key}=${cookieJar[key].value};`;
    });
    return docCookie;
  });

  vi.spyOn(document, 'cookie', 'set').mockImplementation(
    (cookieString: string) => {
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
  return cookieJar;
}

describe(`useShopifyCookies`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no longer sets cookies (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Cookies are now managed server-side only.
    const cookieJar: MockCookieJar = mockCookie();
    const initialCookies = getShopifyCookies(document.cookie);

    expect(initialCookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });

    // Hook no longer writes cookies
    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    const afterCookies = getShopifyCookies(document.cookie);

    // Cookies remain empty since frontend writing is disabled
    expect(afterCookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('no longer modifies existing cookies (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Existing cookies are preserved.
    const cookieJar: MockCookieJar = mockCookie();
    document.cookie = '_shopify_s=abc123; Max-Age=1800;';
    document.cookie = '_shopify_y=def456; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    const cookies = getShopifyCookies(document.cookie);

    // Existing cookies remain unchanged since frontend writing is disabled
    expect(cookies).toEqual({
      _shopify_s: 'abc123',
      _shopify_y: 'def456',
    });
    expect(Object.keys(cookieJar).length).toBe(2);
  });

  it('no longer sets missing cookies (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Missing cookies are not created.
    const cookieJar: MockCookieJar = mockCookie();
    document.cookie = '_shopify_s=abc123; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    let cookies = getShopifyCookies(document.cookie);

    // Only existing cookie is preserved, missing _shopify_y is not created
    expect(cookies).toEqual({
      _shopify_s: 'abc123',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(1);

    document.cookie = '_shopify_s=1; expires=1 Jan 1970 00:00:00 GMT;';
    document.cookie = '_shopify_y=def456; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    cookies = getShopifyCookies(document.cookie);

    // Only existing cookie is preserved, missing _shopify_s is not created
    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: 'def456',
    });
    expect(Object.keys(cookieJar).length).toBe(1);
  });

  it('no longer manages cookie expiry (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Cookie expiry is managed server-side.
    const cookieJar: MockCookieJar = mockCookie();

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    const cookies = getShopifyCookies(document.cookie);

    // No cookies are created since frontend writing is disabled
    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('domain parameter no longer has effect (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Domain parameter is ignored.
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'myshop.com';

    renderHook(() => useShopifyCookies({hasUserConsent: true, domain}));

    const cookies = getShopifyCookies(document.cookie);

    // No cookies are created regardless of domain parameter
    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('domain parameter with leading period no longer has effect (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Domain parameter is ignored.
    const cookieJar: MockCookieJar = mockCookie();
    const domain = '.myshop.com';

    renderHook(() => useShopifyCookies({hasUserConsent: true, domain}));

    const cookies = getShopifyCookies(document.cookie);

    // No cookies are created regardless of domain parameter format
    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('no longer removes cookies (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Cookie removal is managed server-side.
    const cookieJar: MockCookieJar = mockCookie();
    document.cookie = '_shopify_s=abc123; Max-Age=1800;';
    document.cookie = '_shopify_y=def456; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    let cookies = getShopifyCookies(document.cookie);

    // Existing cookies remain
    expect(cookies).toEqual({
      _shopify_s: 'abc123',
      _shopify_y: 'def456',
    });

    renderHook(() => useShopifyCookies());

    cookies = getShopifyCookies(document.cookie);

    // Cookies are not removed since frontend manipulation is disabled
    expect(cookies).toEqual({
      _shopify_s: 'abc123',
      _shopify_y: 'def456',
    });

    expect(Object.keys(cookieJar).length).toBe(2);
  });

  it('checkoutDomain parameter no longer has effect (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. CheckoutDomain parameter is ignored.
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'myshop.com';
    const checkoutDomain = 'checkout.myshop.com';

    renderHook(() =>
      useShopifyCookies({hasUserConsent: true, domain, checkoutDomain}),
    );

    const cookies = getShopifyCookies(document.cookie);

    // No cookies are created regardless of checkoutDomain parameter
    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('subdomain parameters no longer have effect (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Subdomain logic is no longer applied.
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'ca.myshop.com';
    const checkoutDomain = 'checkout.myshop.com';

    renderHook(() =>
      useShopifyCookies({hasUserConsent: true, domain, checkoutDomain}),
    );

    const cookies = getShopifyCookies(document.cookie);

    // No cookies are created regardless of subdomain configuration
    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('localhost configuration no longer has effect (deprecated functionality)', () => {
    // Frontend cookie writing has been disabled. Localhost handling is no longer relevant.
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'localhost:3000';
    const checkoutDomain = 'checkout.myshop.com';

    renderHook(() =>
      useShopifyCookies({hasUserConsent: true, domain, checkoutDomain}),
    );

    const cookies = getShopifyCookies(document.cookie);

    // No cookies are created on localhost since frontend writing is disabled
    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });
    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('shows deprecation warning in development mode', () => {
    // Test that deprecation warning is shown to alert developers
    const originalDev = globalThis.__HYDROGEN_DEV__;
    globalThis.__HYDROGEN_DEV__ = true;

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('useShopifyCookies is deprecated'),
    );

    consoleSpy.mockRestore();
    globalThis.__HYDROGEN_DEV__ = originalDev;
  });
});
