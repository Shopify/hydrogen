import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {HydrogenSession} from '../hydrogen';
import {CUSTOMER_ACCOUNT_SESSION_KEY} from './constants';
import {checkExpires, clearSession, refreshToken} from './auth.helpers';

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
    constructor(body: any, options: any) {
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

describe('auth.helpers', () => {
  describe('refreshToken', () => {
    beforeEach(() => {
      session = {
        commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
        get: vi.fn(),
        set: vi.fn(),
        unset: vi.fn(),
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("Throws BadRequest when there's no refresh token in the session", async () => {
      async function run() {
        await refreshToken({
          session,
          customerAccountId: 'customerAccountId',
          customerAccountUrl: 'customerAccountUrl',
          origin: 'https://localhost',
        });
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized No refreshToken found in the session. Make sure your session is configured correctly and passed to `createCustomerClient`.',
      );
    });

    it('Throws Unauthorized when refresh token fails', async () => {
      (session.get as any).mockReturnValueOnce({refreshToken: undefined});

      fetch.mockResolvedValue(createFetchResponse('Unauthorized', {ok: false}));

      async function run() {
        await refreshToken({
          session,
          customerAccountId: 'customerAccountId',
          customerAccountUrl: 'customerAccountUrl',
          origin: 'https://localhost',
        });
      }

      await expect(run).rejects.toThrowError('Unauthorized');
    });

    it('Throws when there is no valid authorization code in the session', async () => {
      (session.get as any).mockReturnValueOnce({
        refreshToken: 'refreshToken',
      });

      fetch.mockResolvedValue(
        createFetchResponse(
          {
            access_token: '',
            expires_in: '',
            id_token: '',
            refresh_token: '',
          },
          {ok: true},
        ),
      );

      async function run() {
        await refreshToken({
          session,
          customerAccountId: 'customerAccountId',
          customerAccountUrl: 'customerAccountUrl',
          origin: 'https://localhost',
        });
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized oAuth access token was not provided during token exchange.',
      );
    });

    it('Refreshes the token', async () => {
      (session.get as any).mockReturnValueOnce({
        refreshToken: 'old_refresh_token',
      });

      fetch.mockResolvedValue(
        createFetchResponse(
          {
            access_token: 'access_token',
            expires_in: '',
            id_token: 'id_token',
            refresh_token: 'refresh_token',
          },
          {ok: true},
        ),
      );

      await refreshToken({
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'customerAccountUrl',
        origin: 'https://localhost',
      });

      expect(session.set).toHaveBeenNthCalledWith(
        1,
        CUSTOMER_ACCOUNT_SESSION_KEY,
        {
          accessToken: 'access_token',
          expiresAt: expect.any(String),
          refreshToken: 'refresh_token',
          idToken: 'id_token',
        },
      );
    });
  });

  describe('clearSession', () => {
    beforeEach(() => {
      session = {
        commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
        get: vi.fn(),
        set: vi.fn(),
        unset: vi.fn(),
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('Clears the session', async () => {
      clearSession(session);
      expect(session.unset).toHaveBeenCalledWith(CUSTOMER_ACCOUNT_SESSION_KEY);
    });
  });

  describe('checkExpires', () => {
    beforeEach(() => {
      session = {
        commit: vi.fn(() => new Promise((resolve) => resolve('cookie'))),
        get: vi.fn(),
        set: vi.fn(),
        unset: vi.fn(),
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("no-ops if the session isn't expired", async () => {
      async function run() {
        await checkExpires({
          locks: {},
          expiresAt: new Date().getTime() + 10000 + '',
          session,
          customerAccountId: 'customerAccountId',
          customerAccountUrl: 'customerAccountUrl',
          origin: 'https://localhost',
        });
      }

      expect(await run()).toBeUndefined();
    });

    it('Refreshes the token', async () => {
      (session.get as any).mockReturnValueOnce({
        refreshToken: 'old_refresh_token',
      });

      fetch.mockResolvedValue(
        createFetchResponse(
          {
            access_token: 'access_token',
            expires_in: '',
            id_token: 'id_token',
            refresh_token: 'refresh_token',
          },
          {ok: true},
        ),
      );

      await checkExpires({
        locks: {},
        expiresAt: '100',
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'customerAccountUrl',
        origin: 'https://localhost',
      });

      expect(session.set).toHaveBeenNthCalledWith(
        1,
        CUSTOMER_ACCOUNT_SESSION_KEY,
        {
          accessToken: 'access_token',
          expiresAt: expect.any(String),
          refreshToken: 'refresh_token',
          idToken: 'id_token',
        },
      );
    });

    it('does not refresh the token when a refresh is already in process', async () => {
      (session.get as any).mockReturnValueOnce({
        refreshToken: 'old_refresh_token',
      });

      fetch.mockResolvedValue(
        createFetchResponse(
          {
            access_token: 'access_token',
            expires_in: '',
            id_token: 'id_token',
            refresh_token: 'refresh_token',
          },
          {ok: true},
        ),
      );

      await checkExpires({
        locks: {
          // mock an existing refresh promise
          refresh: Promise.resolve(),
        },
        expiresAt: '100',
        session,
        customerAccountId: 'customerAccountId',
        customerAccountUrl: 'customerAccountUrl',
        origin: 'https://localhost',
      });

      expect(session.set).not.toHaveBeenNthCalledWith(1, 'customerAccount', {
        accessToken: 'access_token',
        expiresAt: expect.any(String),
        refreshToken: 'refresh_token',
        idToken: 'id_token',
      });
    });
  });
});
