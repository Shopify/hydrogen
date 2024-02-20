import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {HydrogenSession, HydrogenSessionData} from '../hydrogen';
import {createCustomerAccountClient} from './customer';
import {CUSTOMER_ACCOUNT_SESSION_KEY} from './constants';
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

describe('customer', () => {
  beforeEach(() => {
    session = {
      commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
      get: vi.fn(() => mockCustomerAccountSession) as HydrogenSession['get'],
      set: vi.fn(),
      unset: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login & logout', () => {
    it('Redirects to the customer account api login url', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
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
      expect(response.headers.get('Set-Cookie')).toBe('cookie');
      const url = new URL(response.headers.get('location')!);

      expect(url.origin).toBe('https://customer-api');
      expect(url.pathname).toBe('/auth/oauth/authorize');

      const params = new URLSearchParams(url.search);

      expect(params.get('client_id')).toBe('customerAccountId');
      expect(params.get('scope')).toBe(
        'openid email https://api.customers.com/auth/customer.graphql',
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

    it('Redirects to the customer account api logout url', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      const response = await customer.logout();

      expect(response.status).toBe(302);
      expect(response.headers.get('Set-Cookie')).toBe('cookie');
      const url = new URL(response.headers.get('location')!);

      expect(url.origin).toBe('https://customer-api');
      expect(url.pathname).toBe('/auth/logout');

      const params = new URLSearchParams(url.search);

      expect(params.get('id_token_hint')).toBe('id_token');

      // Session is cleared
      expect(session.unset).toHaveBeenCalledWith(CUSTOMER_ACCOUNT_SESSION_KEY);
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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

  describe('authorize', () => {
    it('Throws unauthorized if no code or state params are passed', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost?state=state&code=code'),
        waitUntil: vi.fn(),
      });

      fetch.mockResolvedValue(
        createFetchResponse(
          {
            access_token: 'access_token',
            expires_in: '',
            id_token: `${btoa('{}')}.${btoa('{"nonce": "nomatch"}')}.signature`,
            refresh_token: 'refresh_token',
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
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost?state=state&code=code'),
        waitUntil: vi.fn(),
      });

      fetch.mockResolvedValue(
        createFetchResponse(
          {
            access_token: 'access_token',
            expires_in: '',
            id_token: `${btoa('{}')}.${btoa('{"nonce": "nonce"}')}.signature`,
            refresh_token: 'refresh_token',
          },
          {ok: true},
        ),
      );

      const response = await customer.authorize();

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/account');
      expect(response.headers.get('Set-Cookie')).toStrictEqual(
        expect.any(String),
      );

      expect(session.set).toHaveBeenCalledWith(
        CUSTOMER_ACCOUNT_SESSION_KEY,
        expect.objectContaining({
          accessToken: 'access_token',
          expiresAt: expect.any(String),
          idToken: 'e30=.eyJub25jZSI6ICJub25jZSJ9.signature',
          refreshToken: 'refresh_token',
          redirectPath: undefined,
        }),
      );
    });

    it('Redirects to redirectPath on successful authorization and updates session', async () => {
      const redirectPath = '/account/orders';
      session = {
        commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
        get: vi.fn(() => {
          return {...mockCustomerAccountSession, redirectPath};
        }) as HydrogenSession['get'],
        set: vi.fn(),
        unset: vi.fn(),
      };

      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost?state=state&code=code'),
        waitUntil: vi.fn(),
      });

      fetch.mockResolvedValue(
        createFetchResponse(
          {
            access_token: 'access_token',
            expires_in: '',
            id_token: `${btoa('{}')}.${btoa('{"nonce": "nonce"}')}.signature`,
            refresh_token: 'refresh_token',
          },
          {ok: true},
        ),
      );

      const response = await customer.authorize();

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(redirectPath);
      expect(response.headers.get('Set-Cookie')).toStrictEqual(
        expect.any(String),
      );

      expect(session.set).toHaveBeenCalledWith(
        CUSTOMER_ACCOUNT_SESSION_KEY,
        expect.objectContaining({
          accessToken: 'access_token',
          expiresAt: expect.any(String),
          idToken: 'e30=.eyJub25jZSI6ICJub25jZSJ9.signature',
          refreshToken: 'refresh_token',
          redirectPath: undefined,
        }),
      );
    });
  });

  describe('isLoggedIn()', () => {
    it('returns true if logged in', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
        waitUntil: vi.fn(),
      });

      expect(await customer.isLoggedIn()).toBe(true);
    });

    it('returns false if logged out', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
  });

  describe('query', () => {
    it('Makes query', async () => {
      const customer = createCustomerAccountClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
        customerAccountUrl: 'https://customer-api',
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
});
