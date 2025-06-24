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

  it('sets _shopify_s and _shopify_y cookies when not found', () => {
    const cookieJar: MockCookieJar = mockCookie();
    let cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(cookies['_shopify_y']).not.toBe('');

    expect(cookieJar['_shopify_s'].value).not.toBe(
      cookieJar['_shopify_y'].value,
    );
    expect(cookieJar['_shopify_s'].maxage).toBe(1800);
    expect(cookieJar['_shopify_y'].maxage).toBe(31104000);
  });

  it('does not override cookies when it already exists', () => {
    const cookieJar: MockCookieJar = mockCookie();
    document.cookie = '_shopify_s=abc123; Max-Age=1800;';
    document.cookie = '_shopify_y=def456; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    const cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      _shopify_s: 'abc123',
      _shopify_y: 'def456',
    });
    expect(Object.keys(cookieJar).length).toBe(2);
  });

  it('sets new cookie if either cookie is missing', () => {
    const cookieJar: MockCookieJar = mockCookie();
    document.cookie = '_shopify_s=abc123; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    let cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      _shopify_s: 'abc123',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_y']).not.toBe('');
    expect(Object.keys(cookieJar).length).toBe(2);

    document.cookie = '_shopify_s=1; expires=1 Jan 1970 00:00:00 GMT;';
    document.cookie = '_shopify_y=def456; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      _shopify_y: 'def456',
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(Object.keys(cookieJar).length).toBe(2);
  });

  it('sets _shopify_y cookie expiry to 1 year when hasUserConsent is set to true', () => {
    const cookieJar: MockCookieJar = mockCookie();

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    const cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(cookies['_shopify_y']).not.toBe('');

    expect(cookieJar['_shopify_s'].value).not.toBe(
      cookieJar['_shopify_y'].value,
    );
    expect(cookieJar['_shopify_s'].maxage).toBe(1800);
    expect(cookieJar['_shopify_y'].maxage).toBe(31104000);
  });

  it('sets domain with leading period when provided without a leading period', () => {
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'myshop.com';

    renderHook(() => useShopifyCookies({hasUserConsent: true, domain}));

    const cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(cookies['_shopify_y']).not.toBe('');

    expect(cookieJar['_shopify_s'].value).not.toBe(
      cookieJar['_shopify_y'].value,
    );
    expect(cookieJar['_shopify_s']).toMatchObject({
      domain: `.${domain}`,
      maxage: 1800,
    });
    expect(cookieJar['_shopify_y']).toMatchObject({
      domain: `.${domain}`,
      maxage: 31104000,
    });
  });

  it('sets domain as is when provided with a leading period', () => {
    const cookieJar: MockCookieJar = mockCookie();
    const domain = '.myshop.com';

    renderHook(() => useShopifyCookies({hasUserConsent: true, domain}));

    const cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(cookies['_shopify_y']).not.toBe('');

    expect(cookieJar['_shopify_s'].value).not.toBe(
      cookieJar['_shopify_y'].value,
    );
    expect(cookieJar['_shopify_s']).toMatchObject({
      domain,
      maxage: 1800,
    });
    expect(cookieJar['_shopify_y']).toMatchObject({
      domain,
      maxage: 31104000,
    });
  });

  it('removes cookies if hasUserConsent is set to false', () => {
    const cookieJar: MockCookieJar = mockCookie();
    document.cookie = '_shopify_s=abc123; Max-Age=1800;';
    document.cookie = '_shopify_y=def456; Max-Age=1800;';

    renderHook(() => useShopifyCookies({hasUserConsent: true}));

    let cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      _shopify_s: 'abc123',
      _shopify_y: 'def456',
    });

    renderHook(() => useShopifyCookies());

    cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      _shopify_s: '',
      _shopify_y: '',
    });

    expect(Object.keys(cookieJar).length).toBe(0);
  });

  it('sets domain to top level domain when checkoutDomain is supplied', () => {
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'myshop.com';
    const checkoutDomain = 'checkout.myshop.com';

    renderHook(() =>
      useShopifyCookies({hasUserConsent: true, domain, checkoutDomain}),
    );

    const cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(cookies['_shopify_y']).not.toBe('');

    expect(cookieJar['_shopify_s'].value).not.toBe(
      cookieJar['_shopify_y'].value,
    );
    expect(cookieJar['_shopify_s']).toMatchObject({
      domain: `.myshop.com`,
      maxage: 1800,
    });
    expect(cookieJar['_shopify_y']).toMatchObject({
      domain: `.myshop.com`,
      maxage: 31104000,
    });
  });

  it('sets domain to top level domain when domain and checkoutDomain are both subdomains', () => {
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'ca.myshop.com';
    const checkoutDomain = 'checkout.myshop.com';

    renderHook(() =>
      useShopifyCookies({hasUserConsent: true, domain, checkoutDomain}),
    );

    const cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(cookies['_shopify_y']).not.toBe('');

    expect(cookieJar['_shopify_s'].value).not.toBe(
      cookieJar['_shopify_y'].value,
    );
    expect(cookieJar['_shopify_s']).toMatchObject({
      domain: `.myshop.com`,
      maxage: 1800,
    });
    expect(cookieJar['_shopify_y']).toMatchObject({
      domain: `.myshop.com`,
      maxage: 31104000,
    });
  });

  it('does not set domain on localhost if checkoutDomain is supplied', () => {
    const cookieJar: MockCookieJar = mockCookie();
    const domain = 'localhost:3000';
    const checkoutDomain = 'checkout.myshop.com';

    renderHook(() =>
      useShopifyCookies({hasUserConsent: true, domain, checkoutDomain}),
    );

    const cookies = getShopifyCookies(document.cookie);

    expect(cookies).toEqual({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_s: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      _shopify_y: expect.any(String),
    });
    expect(cookies['_shopify_s']).not.toBe('');
    expect(cookies['_shopify_y']).not.toBe('');

    expect(cookieJar['_shopify_s'].value).not.toBe(
      cookieJar['_shopify_y'].value,
    );
    expect(cookieJar['_shopify_s']).toMatchObject({
      maxage: 1800,
    });
    expect(cookieJar['_shopify_y']).toMatchObject({
      maxage: 31104000,
    });
  });
});
