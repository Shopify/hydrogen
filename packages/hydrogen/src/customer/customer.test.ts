import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import crypto from 'node:crypto';
import {
  HydrogenSession,
  checkExpires,
  clearSession,
  refreshToken,
} from './auth.helpers';
import {createCustomerClient} from './customer';

global.crypto = crypto as any;

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

const fetch = (global.fetch = vi.fn() as any);

function createFetchResponse<T>(data: T, options: {ok: boolean}) {
  return {
    json: () => new Promise((resolve) => resolve(data)),
    text: async () => JSON.stringify(data),
    ok: options.ok,
  };
}

let session: HydrogenSession;

describe('customer', () => {
  describe('login & logout', () => {
    beforeEach(() => {
      session = {
        commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
        get: vi.fn(() => 'id_token'),
        set: vi.fn(),
        unset: vi.fn(),
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('returns true if logged in', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      expect(customer.isLoggedIn()).toBe(true);
    });

    it('returns false if logged out', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      (session.get as any).mockReturnValueOnce(undefined);

      expect(customer.isLoggedIn()).toBe(false);
    });

    it('Redirects to the customer account api login url', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      const response = await customer.login();

      expect(session.set).toHaveBeenCalledWith('state', expect.any(String));
      expect(session.set).toHaveBeenCalledWith('nonce', expect.any(String));
      expect(session.set).toHaveBeenCalledWith(
        'code-verifier',
        expect.any(String),
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
      expect(params.get('redirect_uri')).toBe('https://localhost/authorize');
      expect(params.get('state')).toBeTruthy();
      expect(params.get('nonce')).toBeTruthy();
      expect(params.get('code_challenge')).toBeTruthy();
      expect(params.get('code_challenge_method')).toBe('S256');
    });

    it('Redirects to the customer account api logout url', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
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
      expect(session.unset).toHaveBeenCalledWith('code-verifier');
      expect(session.unset).toHaveBeenCalledWith(
        'customer_authorization_code_token',
      );
      expect(session.unset).toHaveBeenCalledWith('expires_at');
      expect(session.unset).toHaveBeenCalledWith('id_token');
      expect(session.unset).toHaveBeenCalledWith('refresh_token');
      expect(session.unset).toHaveBeenCalledWith('customer_access_token');
      expect(session.unset).toHaveBeenCalledWith('state');
      expect(session.unset).toHaveBeenCalledWith('nonce');
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      session = {
        commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
        get: vi.fn((v) => v),
        set: vi.fn(),
        unset: vi.fn(),
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('Throws unauthorized if no code or state params are passed', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      async function run() {
        await customer.authorize();
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized No code or state parameter found in the redirect URL.',
      );
    });

    it("Throws unauthorized if state doesn't match session value", async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost?state=nomatch&code=code'),
      });

      async function run() {
        await customer.authorize();
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized The session state does not match the state parameter. Make sure that the session is configured correctly and passed to `createCustomerClient`.',
      );
    });

    it('Throws if requesting the token fails', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost?state=state&code=code'),
      });

      fetch.mockResolvedValue(createFetchResponse('some text', {ok: false}));

      async function run() {
        await customer.authorize();
      }

      await expect(run).rejects.toThrowError('some text');
    });

    it("Throws if the encoded nonce doesn't match the value in the session", async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost?state=state&code=code'),
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

      async function run() {
        await customer.authorize();
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized Returned nonce does not match: nonce !== nomatch',
      );
    });

    it('Redirects on successful authorization and updates session', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost?state=state&code=code'),
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
      expect(response.headers.get('location')).toBe('/');
      expect(response.headers.get('Set-Cookie')).toStrictEqual(
        expect.any(String),
      );

      expect(session.set).toHaveBeenNthCalledWith(
        1,
        'customer_authorization_code_token',
        'access_token',
      );

      expect(session.set).toHaveBeenNthCalledWith(
        2,
        'expires_at',
        expect.anything(),
      );

      expect(session.set).toHaveBeenNthCalledWith(
        3,
        'id_token',
        'e30=.eyJub25jZSI6ICJub25jZSJ9.signature',
      );

      expect(session.set).toHaveBeenNthCalledWith(
        4,
        'refresh_token',
        'refresh_token',
      );

      expect(session.set).toHaveBeenNthCalledWith(
        5,
        'customer_access_token',
        'access_token',
      );
    });
  });

  describe('query', () => {
    beforeEach(() => {
      session = {
        commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
        get: vi.fn((v) => v),
        set: vi.fn(),
        unset: vi.fn(),
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('Throws unauthorized if no access token is in the session', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      (session.get as any).mockReturnValueOnce(undefined);

      async function run() {
        await customer.query(`some query`);
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized Login before querying the Customer Account API.',
      );
    });

    it('Tries to refresh and throws if there is no refresh token', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      (session.get as any).mockImplementation((v: string) =>
        v === 'expires_at' ? '100' : v === 'refresh_token' ? null : v,
      );

      async function run() {
        await customer.query(`some query`);
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized No refresh_token in the session. Make sure your session is configured correctly and passed to `createCustomerClient`',
      );
    });

    it('Makes query', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      (session.get as any).mockImplementation((v: string) =>
        v === 'expires_at' ? new Date().getTime() + 10000 + '' : v,
      );

      const someJson = {data: 'json'};

      fetch.mockResolvedValue(createFetchResponse(someJson, {ok: true}));

      const response = await customer.query(`some query`);
      expect(response).toBe('json');
      // Session not updated because it's not expired
      expect(session.set).not.toHaveBeenCalled();
    });

    it('Refreshes the token and then makes query', async () => {
      const customer = createCustomerClient({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'https://customer-api',
        request: new Request('https://localhost'),
      });

      (session.get as any).mockImplementation((v: string) =>
        v === 'expires_at' ? '100' : v,
      );

      const someJson = {data: 'json'};

      fetch.mockResolvedValue(createFetchResponse(someJson, {ok: true}));

      const response = await customer.query(`some query`);
      expect(response).toBe('json');
      // Session updated because token was refreshed
      expect(session.set).toHaveBeenCalled();
    });
  });
});
