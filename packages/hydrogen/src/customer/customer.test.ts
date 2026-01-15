import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {HydrogenSession, HydrogenSessionData} from '../types';
import {
  createCustomerAccountClient,
  getMaybeUILocales,
  getMaybeLocale,
} from './customer';
import {BUYER_SESSION_KEY, CUSTOMER_ACCOUNT_SESSION_KEY} from './constants';
import crypto from 'node:crypto';

if (!globalThis.crypto) {
  globalThis.crypto = crypto as any;
}

vi.mock('./BadRequest', () => {
  return {
    BadRequest: class BadRequest {
      message: string;
      constructor(message?: string, helpMessage?: string) {
        this.message = `${message} ${helpMessage}`;
      }
    },
  };
});

vi.stubGlobal(
  'Response',
  class Response {
    message;
    headers;
    status;
    constructor(body: any, options: any) {
      this.headers = options?.headers;
      this.status = options?.status;
      this.message = body;
    }
  },
);

const fetch = (globalThis.fetch = vi.fn() as any);

function createFetchResponse<T>(data: T, options: {ok: boolean}) {
  return {
    json: () => new Promise((resolve) => resolve(data)),
    text: async () => JSON.stringify(data),
    ok: options.ok,
  };
}

let session: HydrogenSession;

const mockCustomerAccountSession: HydrogenSessionData['customerAccount'] = {
  accessToken: 'access_token',
  expiresAt: new Date(new Date().getTime() + 120 * 1000).getTime().toString(),
  refreshToken: 'refresh_token',
  codeVerifier: 'code_verifier',
  idToken: 'id_token',
  state: 'state',
  nonce: 'nonce',
};

const mockBuyerSession = {
  companyLocationId: '1',
};

describe('customer', () => {
  beforeEach(() => {
    session = {
      commit: vi.fn(() => Promise.resolve('cookie')),
      get: vi.fn(() => {
        return {...mockCustomerAccountSession, ...mockBuyerSession};
      }) as HydrogenSession['get'],
      set: vi.fn(),
      unset: vi.fn(),
      destroy: vi.fn(() => Promise.resolve('logout cookie')),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login & logout', () => {
    describe('using new auth url when shopId is present in env', () => {
      it('Redirects to the customer account api login url', async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost'),
          waitUntil: vi.fn(),
        });

        const response = await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            state: expect.any(String),
            nonce: expect.any(String),
            codeVerifier: expect.any(String),
          }),
        );

        expect(response.status).toBe(302);
        const url = new URL(response.headers.get('location')!);

        expect(url.origin).toBe('https://shopify.com');
        expect(url.pathname).toBe('/authentication/1/oauth/authorize');

        const params = new URLSearchParams(url.search);

        expect(params.get('client_id')).toBe('customerAccountId');
        expect(params.get('scope')).toBe(
          'openid email customer-account-api:full',
        );
        expect(params.get('response_type')).toBe('code');
        expect(params.get('redirect_uri')).toBe(
          'https://localhost/account/authorize',
        );
        expect(params.get('state')).toBeTruthy();
        expect(params.get('nonce')).toBeTruthy();
        expect(params.get('code_challenge')).toBeTruthy();
        expect(params.get('code_challenge_method')).toBe('S256');
      });

      it('Redirects to the customer account api login url with authUrl as param', async () => {
        const origin = 'https://localhost';
        const authUrl = '/customer-account/auth';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
          authUrl,
        });

        const response = await customer.login();
        const url = new URL(response.headers.get('location')!);

        expect(url.origin).toBe('https://shopify.com');
        expect(url.pathname).toBe('/authentication/1/oauth/authorize');

        const params = new URLSearchParams(url.search);
        expect(params.get('redirect_uri')).toBe(
          new URL(authUrl, origin).toString(),
        );
      });

      it('Redirects to the customer account api login url with DEFAULT_AUTH_URL as param if authUrl is cross domain', async () => {
        const origin = 'https://something-good.com';
        const authUrl = 'https://something-bad.com/customer-account/auth';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
          authUrl,
        });

        const response = await customer.login();
        const url = new URL(response.headers.get('location')!);

        expect(url.origin).toBe('https://shopify.com');
        expect(url.pathname).toBe('/authentication/1/oauth/authorize');

        const params = new URLSearchParams(url.search);
        expect(params.get('redirect_uri')).toBe(
          new URL('/account/authorize', origin).toString(),
        );
      });

      describe('locales', () => {
        it('Redirects to the customer account api login url with locale as param (language in the constructor)', async () => {
          const origin = 'https://something-good.com';

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
            language: 'FR',
          });

          const response = await customer.login();
          const url = new URL(response.headers.get('location')!);

          expect(url.searchParams.get('locale')).toBe('fr');
          expect(url.searchParams.get('ui_locales')).toBeNull();
        });

        it('Redirects to the customer account api login url with locale as param (locale option)', async () => {
          const origin = 'https://something-good.com';

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.login({
            locale: 'fr',
          });
          const url = new URL(response.headers.get('location')!);

          expect(url.searchParams.get('locale')).toBe('fr');
          expect(url.searchParams.get('ui_locales')).toBeNull();
        });

        it('Redirects to the customer account api login url with locale as param (locale option overrides language)', async () => {
          const origin = 'https://something-good.com';

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
            language: 'IT',
          });

          const response = await customer.login({
            locale: 'fr',
          });
          const url = new URL(response.headers.get('location')!);

          expect(url.searchParams.get('locale')).toBe('fr');
          expect(url.searchParams.get('ui_locales')).toBeNull();
        });

        it('Redirects to the customer account api login url with locale as param (uiLocales option, no language)', async () => {
          const origin = 'https://something-good.com';

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.login({
            uiLocales: 'FR',
          });
          const url = new URL(response.headers.get('location')!);

          expect(url.searchParams.get('locale')).toBe('fr');
        });

        it('locale takes precedence over uiLocales when both are provided', async () => {
          const origin = 'https://something-good.com';

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.login({
            locale: 'de',
            uiLocales: 'FR',
          });
          const url = new URL(response.headers.get('location')!);

          expect(url.searchParams.get('locale')).toBe('de');
          expect(url.searchParams.get('ui_locales')).toBeNull();
        });
      });
    });

    describe('countryCode', () => {
      it('Redirects to the customer account api login url with countryCode as param', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          countryCode: 'US',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('region_country')).toBe('US');
      });

      it('Includes both locale and countryCode when both are provided', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          uiLocales: 'FR',
          countryCode: 'CA',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('locale')).toBe('fr');
        expect(url.searchParams.get('region_country')).toBe('CA');
      });

      it('Does not include region_country param when countryCode is not provided', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login();
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('region_country')).toBeNull();
      });

      it('Handles different country code formats', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        // Test with various country codes
        const countryCodes = ['GB', 'JP', 'AU', 'DE'];

        for (const code of countryCodes) {
          const response = await customer.login({
            countryCode: code as any,
          });
          const url = new URL(response.headers.get('location')!);
          expect(url.searchParams.get('region_country')).toBe(code);
        }
      });
    });

    describe('acrValues', () => {
      it('Redirects to the customer account api login url with acrValues as param', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          acrValues: 'provider:google',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('acr_values')).toBe('provider:google');
      });

      it('Does not include acr_values param when acrValues is not provided', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login();
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('acr_values')).toBeNull();
      });
    });

    describe('loginHint', () => {
      it('Redirects to the customer account api login url with loginHint as param', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          loginHint: 'user@example.com',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('login_hint')).toBe('user@example.com');
      });

      it('Includes loginHint with other login options', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          uiLocales: 'FR',
          countryCode: 'CA',
          acrValues: 'provider:google',
          loginHint: 'user@example.com',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('locale')).toBe('fr');
        expect(url.searchParams.get('region_country')).toBe('CA');
        expect(url.searchParams.get('acr_values')).toBe('provider:google');
        expect(url.searchParams.get('login_hint')).toBe('user@example.com');
      });

      it('Does not include login_hint param when loginHint is not provided', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login();
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('login_hint')).toBeNull();
      });
    });

    describe('loginHintMode', () => {
      it('Includes loginHintMode when loginHint is also provided', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          loginHint: 'user@example.com',
          loginHintMode: 'submit',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('login_hint')).toBe('user@example.com');
        expect(url.searchParams.get('login_hint_mode')).toBe('submit');
      });

      it('Does not include loginHintMode when loginHint is not provided', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          loginHintMode: 'submit',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('login_hint')).toBeNull();
        expect(url.searchParams.get('login_hint_mode')).toBeNull();
      });

      it('Includes loginHintMode with other login options', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          uiLocales: 'FR',
          countryCode: 'CA',
          acrValues: 'provider:google',
          loginHint: 'user@example.com',
          loginHintMode: 'submit',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('locale')).toBe('fr');
        expect(url.searchParams.get('region_country')).toBe('CA');
        expect(url.searchParams.get('acr_values')).toBe('provider:google');
        expect(url.searchParams.get('login_hint')).toBe('user@example.com');
        expect(url.searchParams.get('login_hint_mode')).toBe('submit');
      });

      it('Does not include login_hint_mode param when loginHintMode is not provided', async () => {
        const origin = 'https://something-good.com';

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request(origin),
          waitUntil: vi.fn(),
        });

        const response = await customer.login({
          loginHint: 'user@example.com',
        });
        const url = new URL(response.headers.get('location')!);

        expect(url.searchParams.get('login_hint')).toBe('user@example.com');
        expect(url.searchParams.get('login_hint_mode')).toBeNull();
      });
    });

    describe('logout', () => {
      describe('using new auth url when shopId is present in env', () => {
        it('Redirects to the customer account api logout url', async () => {
          const origin = 'https://shop123.com';

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.logout();

          expect(response.status).toBe(302);
          const url = new URL(response.headers.get('location')!);

          expect(url.origin).toBe('https://shopify.com');
          expect(url.pathname).toBe('/authentication/1/logout');

          const params = new URLSearchParams(url.search);

          expect(params.get('id_token_hint')).toBe('id_token');
          expect(params.get('post_logout_redirect_uri')).toBe(
            new URL(origin).toString(),
          );

          // Session is cleared
          expect(session.unset).toHaveBeenCalledWith(
            CUSTOMER_ACCOUNT_SESSION_KEY,
          );

          expect(session.destroy).toHaveBeenCalled();
        });

        it('Redirects to the customer account api logout url with postLogoutRedirectUri in the param', async () => {
          const origin = 'https://shop123.com';
          const postLogoutRedirectUri = '/post-logout-landing-page';

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.logout({postLogoutRedirectUri});

          const url = new URL(response.headers.get('location')!);
          expect(url.origin).toBe('https://shopify.com');
          expect(url.pathname).toBe('/authentication/1/logout');

          const params = new URLSearchParams(url.search);
          expect(params.get('id_token_hint')).toBe('id_token');
          expect(params.get('post_logout_redirect_uri')).toBe(
            `${origin}${postLogoutRedirectUri}`,
          );

          // Session is cleared
          expect(session.unset).toHaveBeenCalledWith(
            CUSTOMER_ACCOUNT_SESSION_KEY,
          );
        });

        it('Redirects to the customer account api logout url with optional headers from params included', async () => {
          const origin = 'https://shop123.com';
          const headers = {'Set-Cookie': 'cookie=test;'};

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.logout({headers});

          const url = new URL(response.headers.get('location')!);
          expect(url.origin).toBe('https://shopify.com');
          expect(url.pathname).toBe('/authentication/1/logout');

          // Session destroyed
          expect(response.headers.get('Set-Cookie')).toBe('logout cookie');

          // Session is cleared
          expect(session.unset).toHaveBeenCalledWith(
            CUSTOMER_ACCOUNT_SESSION_KEY,
          );
        });

        it('Keeps session data when keepSession is true', async () => {
          const origin = 'https://shop123.com';
          const headers = {'Set-Cookie': 'cookie=test;'};

          const customer = createCustomerAccountClient({
            session,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.logout({headers, keepSession: true});

          const url = new URL(response.headers.get('location')!);
          expect(url.origin).toBe('https://shopify.com');
          expect(url.pathname).toBe('/authentication/1/logout');

          // Standard cookie, session isn't destroyed
          expect(response.headers.get('Set-Cookie')).toBe('cookie=test;');

          expect(session.unset).toHaveBeenCalledWith(
            CUSTOMER_ACCOUNT_SESSION_KEY,
          );
        });

        it('Redirects to app origin when customer is not login by default', async () => {
          const origin = 'https://shop123.com';
          const mockSession: HydrogenSession = {
            commit: vi.fn(() => Promise.resolve('cookie')),
            get: vi.fn(() => undefined) as HydrogenSession['get'],
            set: vi.fn(),
            unset: vi.fn(),
            destroy: vi.fn(() => Promise.resolve('logout cookie')),
          };

          const customer = createCustomerAccountClient({
            session: mockSession,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.logout();

          const url = new URL(response.headers.get('location')!);
          expect(url.toString()).toBe(new URL(origin).toString());

          // Session is cleared
          expect(mockSession.unset).toHaveBeenCalledWith(
            CUSTOMER_ACCOUNT_SESSION_KEY,
          );
        });

        it('Redirects to postLogoutRedirectUri when customer is not login', async () => {
          const origin = 'https://shop123.com';
          const postLogoutRedirectUri = '/post-logout-landing-page';

          const mockSession: HydrogenSession = {
            commit: vi.fn(() => Promise.resolve('cookie')),
            get: vi.fn(() => undefined) as HydrogenSession['get'],
            set: vi.fn(),
            unset: vi.fn(),
            destroy: vi.fn(() => Promise.resolve('logout cookie')),
          };

          const customer = createCustomerAccountClient({
            session: mockSession,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.logout({postLogoutRedirectUri});

          const url = new URL(response.headers.get('location')!);
          expect(url.toString()).toBe(
            new URL(postLogoutRedirectUri, origin).toString(),
          );

          // Session is cleared
          expect(mockSession.unset).toHaveBeenCalledWith(
            CUSTOMER_ACCOUNT_SESSION_KEY,
          );
        });

        it('Redirects to app origin if postLogoutRedirectUri is cross-site when customer is not login', async () => {
          const origin = 'https://shop123.com';
          const postLogoutRedirectUri =
            'https://something-bad.com/post-logout-landing-page';

          const mockSession: HydrogenSession = {
            commit: vi.fn(() => Promise.resolve('cookie')),
            get: vi.fn(() => undefined) as HydrogenSession['get'],
            set: vi.fn(),
            unset: vi.fn(),
            destroy: vi.fn(() => Promise.resolve('logout cookie')),
          };

          const customer = createCustomerAccountClient({
            session: mockSession,
            customerAccountId: 'customerAccountId',
            shopId: '1',
            request: new Request(origin),
            waitUntil: vi.fn(),
          });

          const response = await customer.logout({postLogoutRedirectUri});

          const url = new URL(response.headers.get('location')!);
          expect(url.toString()).toBe(new URL(origin).toString());

          // Session is cleared
          expect(mockSession.unset).toHaveBeenCalledWith(
            CUSTOMER_ACCOUNT_SESSION_KEY,
          );
        });
      });

      it('Saved redirectPath to session by default if `return_to` param was found', async () => {
        const redirectPath = '/account/orders';
        const request = new Request(
          `https://localhost?${new URLSearchParams({
            return_to: redirectPath,
          }).toString()}`,
        );

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request,
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath,
          }),
        );
      });

      it('Saved redirectPath to session by default if `redirect` param was found', async () => {
        const redirectPath = '/account/orders';
        const request = new Request(
          `https://localhost?${new URLSearchParams({
            redirect: redirectPath,
          }).toString()}`,
        );

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request,
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath,
          }),
        );
      });

      it('Saved redirectPath to session by default if request referer was found', async () => {
        const redirectPath = '/account/orders';
        const request = new Request('https://localhost');
        request.headers.set('Referer', redirectPath);

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request,
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath,
          }),
        );
      });

      it('Saved redirectPath to session by default', async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost'),
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath: '/account',
          }),
        );
      });

      it('Saved redirectPath to session by default if `return_to` param was found', async () => {
        const redirectPath = '/account/orders';
        const request = new Request(
          `https://localhost?${new URLSearchParams({
            return_to: redirectPath,
          }).toString()}`,
        );

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request,
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath,
          }),
        );
      });

      it('Saved redirectPath to session by default if `redirect` param was found', async () => {
        const redirectPath = '/account/orders';
        const request = new Request(
          `https://localhost?${new URLSearchParams({
            redirect: redirectPath,
          }).toString()}`,
        );

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request,
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath,
          }),
        );
      });

      it('Saved redirectPath to session by default if request referer was found', async () => {
        const redirectPath = '/account/orders';
        const request = new Request('https://localhost');
        request.headers.set('Referer', redirectPath);

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request,
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath,
          }),
        );
      });

      it('Saved redirectPath to session by default', async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost'),
          waitUntil: vi.fn(),
        });

        await customer.login();

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            redirectPath: '/account',
          }),
        );
      });
    });
  });

  describe('authorize', () => {
    describe('using new auth url when shopId is present in env', () => {
      it('Throws unauthorized if no code or state params are passed', async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost'),
          waitUntil: vi.fn(),
        });

        await expect(customer.authorize()).rejects.toThrowError(
          'Unauthorized No code or state parameter found in the redirect URL.',
        );
      });

      it("Throws unauthorized if state doesn't match session value", async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost?state=nomatch&code=code'),
          waitUntil: vi.fn(),
        });

        await expect(customer.authorize()).rejects.toThrowError(
          'Unauthorized The session state does not match the state parameter. Make sure that the session is configured correctly and passed to `createCustomerAccountClient`.',
        );
      });

      it('Throws if requesting the token fails', async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost?state=state&code=code'),
          waitUntil: vi.fn(),
        });

        fetch.mockResolvedValue(createFetchResponse('some text', {ok: false}));

        await expect(customer.authorize()).rejects.toThrowError('some text');
      });

      it("Throws if the encoded nonce doesn't match the value in the session", async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost?state=state&code=code'),
          waitUntil: vi.fn(),
        });

        fetch.mockResolvedValue(
          createFetchResponse(
            {
              access_token: 'shcat_access_token',
              expires_in: '',
              id_token: `${btoa('{}')}.${btoa(
                '{"nonce": "nomatch"}',
              )}.signature`,
              refresh_token: 'shcrt_refresh_token',
            },
            {ok: true},
          ),
        );

        await expect(customer.authorize()).rejects.toThrowError(
          'Unauthorized Returned nonce does not match: nonce !== nomatch',
        );
      });

      it('Redirects on successful authorization and updates session', async () => {
        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost?state=state&code=code'),
          waitUntil: vi.fn(),
        });

        fetch.mockResolvedValue(
          createFetchResponse(
            {
              access_token: 'shcat_access_token',
              expires_in: '',
              id_token: `${btoa('{}')}.${btoa('{"nonce": "nonce"}')}.signature`,
              refresh_token: 'shcrt_refresh_token',
            },
            {ok: true},
          ),
        );

        const response = await customer.authorize();

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/account');

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            accessToken: 'shcat_access_token',
            expiresAt: expect.any(String),
            idToken: 'e30=.eyJub25jZSI6ICJub25jZSJ9.signature',
            refreshToken: 'shcrt_refresh_token',
          }),
        );
      });

      it('Redirects to redirectPath on successful authorization and updates session', async () => {
        const redirectPath = '/account/orders';
        session = {
          commit: vi.fn(() => Promise.resolve('cookie')),
          get: vi.fn(() => {
            return {...mockCustomerAccountSession, redirectPath};
          }) as HydrogenSession['get'],
          set: vi.fn(),
          unset: vi.fn(),
          destroy: vi.fn(() => Promise.resolve('logout cookie')),
        };

        const customer = createCustomerAccountClient({
          session,
          customerAccountId: 'customerAccountId',
          shopId: '1',
          request: new Request('https://localhost?state=state&code=code'),
          waitUntil: vi.fn(),
        });

        fetch.mockResolvedValue(
          createFetchResponse(
            {
              access_token: 'shcat_access_token',
              expires_in: '',
              id_token: `${btoa('{}')}.${btoa('{"nonce": "nonce"}')}.signature`,
              refresh_token: 'shcrt_refresh_token',
            },
            {ok: true},
          ),
        );

        const response = await customer.authorize();

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe(redirectPath);

        expect(session.set).toHaveBeenCalledWith(
          CUSTOMER_ACCOUNT_SESSION_KEY,
          expect.objectContaining({
            accessToken: 'shcat_access_token',
            expiresAt: expect.any(String),
            idToken: 'e30=.eyJub25jZSI6ICJub25jZSJ9.signature',
            refreshToken: 'shcrt_refresh_token',
          }),
        );
      });
    });
  });

  describe('isLoggedIn()', () => {
    it('returns true if logged in', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      expect(await customer.isLoggedIn()).toBe(true);
    });

    it('returns false if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockReturnValueOnce(undefined);

      expect(await customer.isLoggedIn()).toBe(false);
    });

    it('returns true after refreshes the token', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockImplementation(() => ({
        ...mockCustomerAccountSession,
        expiresAt: '100',
      }));

      fetch.mockResolvedValueOnce(
        createFetchResponse({access_token: 'access_token'}, {ok: true}),
      );

      const someJson = {data: 'json'};
      fetch.mockResolvedValue(createFetchResponse(someJson, {ok: true}));

      expect(await customer.isLoggedIn()).toBe(true);
    });

    it('returns false after tries to refresh but fail (no refresh token)', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockImplementation(() => ({
        ...mockCustomerAccountSession,
        expiresAt: '100',
        refreshToken: undefined,
      }));

      expect(await customer.isLoggedIn()).toBe(false);
    });
  });

  describe('getAccessToken()', async () => {
    it('returns access token if logged in', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      expect(await customer.getAccessToken()).toBe(
        mockCustomerAccountSession.accessToken,
      );
    });

    it('returns undefined if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockReturnValueOnce(undefined);

      expect(await customer.getAccessToken()).toBeUndefined();
    });

    it('returns access token after refreshes the token', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockImplementation(() => ({
        ...mockCustomerAccountSession,
        expiresAt: '100',
      }));

      fetch.mockResolvedValueOnce(
        createFetchResponse({access_token: 'access_token'}, {ok: true}),
      );

      const someJson = {data: 'json'};
      fetch.mockResolvedValue(createFetchResponse(someJson, {ok: true}));

      expect(await customer.getAccessToken()).toBe('access_token');
    });

    it('returns false after tries to refresh but fail', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockImplementation(() => ({
        ...mockCustomerAccountSession,
        expiresAt: '100',
        refreshToken: undefined,
      }));

      expect(await customer.getAccessToken()).toBeUndefined();
    });
  });

  describe('handleAuthStatus()', async () => {
    it('throw redirect to login path and current path as param if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/account/orders'),
        waitUntil: vi.fn(),
      });
      (session.get as any).mockReturnValueOnce(undefined);

      try {
        await customer.handleAuthStatus();
      } catch (error) {
        expect((error as Response).status).toBe(302);
        expect((error as Response).headers.get('location')).toBe(
          '/account/login?return_to=%2Faccount%2Forders',
        );
      }
    });

    it('does not throw redirect if logged in', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/account/orders'),
        waitUntil: vi.fn(),
      });

      expect(await customer.handleAuthStatus()).toBeUndefined();
    });

    it('throw unauthorizedHandler() if logged out', async () => {
      const customAuthStatusHandler = vi.fn();
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/account/orders'),
        waitUntil: vi.fn(),
        customAuthStatusHandler,
      });
      (session.get as any).mockReturnValueOnce(undefined);

      try {
        await customer.handleAuthStatus();
      } catch {
        expect(customAuthStatusHandler).toHaveBeenCalledOnce();
      }
    });

    it('handles Remix `https://localhost/account/orders.data` url extensions when passing current path as param if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/account/orders.data'),
        waitUntil: vi.fn(),
      });
      (session.get as any).mockReturnValueOnce(undefined);

      try {
        await customer.handleAuthStatus();
      } catch (error) {
        expect((error as Response).status).toBe(302);
        expect((error as Response).headers.get('location')).toBe(
          '/account/login?return_to=%2Faccount%2Forders',
        );
      }
    });

    it('handles Remix `https://localhost/account/_root.data` url extensions when passing current path as param if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/account/_root.data'),
        waitUntil: vi.fn(),
      });
      (session.get as any).mockReturnValueOnce(undefined);

      try {
        await customer.handleAuthStatus();
      } catch (error) {
        expect((error as Response).status).toBe(302);
        expect((error as Response).headers.get('location')).toBe(
          '/account/login?return_to=%2Faccount',
        );
      }
    });

    it('handles Remix `https://localhost/_root.data` url extensions when passing current path as param if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/_root.data'),
        waitUntil: vi.fn(),
      });
      (session.get as any).mockReturnValueOnce(undefined);

      try {
        await customer.handleAuthStatus();
      } catch (error) {
        expect((error as Response).status).toBe(302);
        expect((error as Response).headers.get('location')).toBe(
          '/account/login?return_to=%2F',
        );
      }
    });
  });

  describe('query', () => {
    it('Makes query', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockImplementation(() => ({
        ...mockCustomerAccountSession,
        expiresAt: new Date().getTime() + 10000 + '',
      }));

      const someJson = {data: 'json'};

      fetch.mockResolvedValue(createFetchResponse(someJson, {ok: true}));

      const response = await customer.query(`query {...}`);
      expect(response).toStrictEqual({data: 'json'});
      // Session not updated because it's not expired
      expect(session.set).not.toHaveBeenCalled();
    });

    it('throw redirect to login path and current path as param if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/account/orders/123'),
        waitUntil: vi.fn(),
      });
      (session.get as any).mockReturnValueOnce(undefined);

      try {
        await customer.query(`query {...}`);
      } catch (error) {
        expect((error as Response).status).toBe(302);
        expect((error as Response).headers.get('location')).toBe(
          '/account/login?return_to=%2Faccount%2Forders%2F123',
        );
      }
    });

    it('throw customAuthStatusHandler() if logged out', async () => {
      const customAuthStatusHandler = vi.fn();
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost/account/orders'),
        waitUntil: vi.fn(),
        customAuthStatusHandler,
      });
      (session.get as any).mockReturnValueOnce(undefined);

      try {
        await customer.query(`query {...}`);
      } catch {
        expect(customAuthStatusHandler).toHaveBeenCalledOnce();
      }
    });
  });

  describe('setBuyer()', async () => {
    it('set buyer in session', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      customer.setBuyer(mockBuyerSession);

      expect(session.set).toHaveBeenCalledWith(
        BUYER_SESSION_KEY,
        expect.objectContaining(mockBuyerSession),
      );
    });
  });

  describe('setBuyer and getBuyer()', async () => {
    it('returns a buyer when logged in', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      const buyer = await customer.getBuyer();

      expect(buyer).toEqual(
        expect.objectContaining({
          ...mockBuyerSession,
          customerAccessToken: 'access_token',
        }),
      );
    });

    it('returns undefined when not logged in', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        shopId: '1',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      (session.get as any).mockReturnValueOnce(undefined);

      const buyer = await customer.getBuyer();

      expect(buyer).toBeUndefined();
    });
  });
});

// Unit test
describe('getMaybeUILocales', () => {
  it('returns null if no i18n is provided', () => {
    const uiLocales = getMaybeUILocales({
      contextLanguage: null,
      uiLocalesOverride: null,
    });
    expect(uiLocales).toBeNull();
  });

  it('returns the context locale (formatted) if no options override is provided', () => {
    const uiLocales = getMaybeUILocales({
      contextLanguage: 'EN',
      uiLocalesOverride: null,
    });
    expect(uiLocales).toBe('en');

    const uiLocalesWithRegion = getMaybeUILocales({
      contextLanguage: 'PT_PT',
      uiLocalesOverride: null,
    });
    expect(uiLocalesWithRegion).toBe('pt-PT');
  });

  it('returns the uiLocales data (formatted) if the i18n locale is not provided', () => {
    const uiLocales = getMaybeUILocales({
      contextLanguage: null,
      uiLocalesOverride: 'FR',
    });
    expect(uiLocales).toBe('fr');

    const uiLocalesWithRegion = getMaybeUILocales({
      contextLanguage: null,
      uiLocalesOverride: 'PT_PT',
    });
    expect(uiLocalesWithRegion).toBe('pt-PT');
  });

  it('overrides the i18n locale if both the it and the uiLocales override are provided', () => {
    const uiLocales = getMaybeUILocales({
      contextLanguage: 'EN',
      uiLocalesOverride: 'FR',
    });
    expect(uiLocales).toBe('fr');
  });

  it('enforces a regional variant if the language is a regional language', () => {
    const portuguese = getMaybeUILocales({
      contextLanguage: 'PT',
      uiLocalesOverride: null,
    });
    expect(portuguese).toBe('pt-PT');

    const mandarin = getMaybeUILocales({
      contextLanguage: 'ZH',
      uiLocalesOverride: null,
    });
    expect(mandarin).toBe('zh-CN');

    const dutch = getMaybeUILocales({
      contextLanguage: 'NL',
      uiLocalesOverride: null,
    });
    expect(dutch).toBe('nl');
  });
});

describe('getMaybeLocale', () => {
  it('returns null if no language is provided', () => {
    const locale = getMaybeLocale({
      contextLanguage: null,
      localeOverride: null,
      uiLocalesOverride: null,
    });
    expect(locale).toBeNull();
  });

  it('returns lowercase for regular languages', () => {
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('en');
    expect(
      getMaybeLocale({
        contextLanguage: 'FR',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('fr');
    expect(
      getMaybeLocale({
        contextLanguage: 'DE',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('de');
    expect(
      getMaybeLocale({
        contextLanguage: 'JA',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('ja');
    expect(
      getMaybeLocale({
        contextLanguage: 'KO',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('ko');
  });

  it('returns language-country format for regional languages', () => {
    expect(
      getMaybeLocale({
        contextLanguage: 'PT_BR',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('pt-BR');
    expect(
      getMaybeLocale({
        contextLanguage: 'PT_PT',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('pt-PT');
    expect(
      getMaybeLocale({
        contextLanguage: 'ZH_CN',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('zh-CN');
    expect(
      getMaybeLocale({
        contextLanguage: 'ZH_TW',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('zh-TW');
  });

  it('uses localeOverride when provided (highest priority)', () => {
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: 'fr',
        uiLocalesOverride: 'DE',
      }),
    ).toBe('fr');
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: 'zh-CN',
        uiLocalesOverride: 'JA',
      }),
    ).toBe('zh-CN');
  });

  it('uses uiLocalesOverride when localeOverride is null (second priority)', () => {
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: null,
        uiLocalesOverride: 'FR',
      }),
    ).toBe('fr');
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: null,
        uiLocalesOverride: 'ZH_CN',
      }),
    ).toBe('zh-CN');
  });

  it('falls back to contextLanguage when both overrides are null', () => {
    expect(
      getMaybeLocale({
        contextLanguage: 'DE',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('de');
    expect(
      getMaybeLocale({
        contextLanguage: 'ZH_TW',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('zh-TW');
  });

  it('normalizes localeOverride format', () => {
    // Uppercase to lowercase
    expect(
      getMaybeLocale({
        contextLanguage: null,
        localeOverride: 'FR',
        uiLocalesOverride: null,
      }),
    ).toBe('fr');
    expect(
      getMaybeLocale({
        contextLanguage: null,
        localeOverride: 'EN',
        uiLocalesOverride: null,
      }),
    ).toBe('en');
    // Underscore to hyphen with proper casing
    expect(
      getMaybeLocale({
        contextLanguage: null,
        localeOverride: 'ZH_CN',
        uiLocalesOverride: null,
      }),
    ).toBe('zh-CN');
    expect(
      getMaybeLocale({
        contextLanguage: null,
        localeOverride: 'PT_BR',
        uiLocalesOverride: null,
      }),
    ).toBe('pt-BR');
    // Already correct format stays the same
    expect(
      getMaybeLocale({
        contextLanguage: null,
        localeOverride: 'zh-CN',
        uiLocalesOverride: null,
      }),
    ).toBe('zh-CN');
    expect(
      getMaybeLocale({
        contextLanguage: null,
        localeOverride: 'pt-BR',
        uiLocalesOverride: null,
      }),
    ).toBe('pt-BR');
  });

  it('respects priority order: localeOverride > uiLocalesOverride > contextLanguage', () => {
    // All three provided - localeOverride wins
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: 'fr',
        uiLocalesOverride: 'DE',
      }),
    ).toBe('fr');
    // Only uiLocalesOverride and contextLanguage - uiLocalesOverride wins
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: null,
        uiLocalesOverride: 'DE',
      }),
    ).toBe('de');
    // Only contextLanguage - contextLanguage is used
    expect(
      getMaybeLocale({
        contextLanguage: 'EN',
        localeOverride: null,
        uiLocalesOverride: null,
      }),
    ).toBe('en');
  });
});
