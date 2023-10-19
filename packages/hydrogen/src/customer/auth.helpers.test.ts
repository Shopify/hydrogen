import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
  HydrogenSession,
  checkExpires,
  clearSession,
  refreshToken,
} from './auth.helpers';

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

// vi.stubGlobal(
//   'Response',
//   class Response {
//     // message;
//     constructor(body: any, options: any) {
//       // this.message = body;
//     }
//   },
// );

const fetch = (global.fetch = vi.fn() as any);

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
        await refreshToken(
          session,
          'customerAccountId',
          'customerAccountUrl',
          'https://localhost',
        );
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized No refresh_token in the session. Make sure your session is configured correctly and passed to `createCustomerClient`.',
      );
    });

    it('Throws Unauthorized when refresh token fails', async () => {
      (session.get as any).mockResolvedValueOnce('refresh_token');

      fetch.mockResolvedValue(createFetchResponse('Unauthorized', {ok: false}));

      async function run() {
        await refreshToken(
          session,
          'customerAccountId',
          'customerAccountUrl',
          'https://localhost',
        );
      }

      await expect(run).rejects.toThrowError('Unauthorized');
    });

    it('Throws when there is no valid authorization code in the session', async () => {
      (session.get as any).mockResolvedValueOnce('refresh_token');

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
        await refreshToken(
          session,
          'customerAccountId',
          'customerAccountUrl',
          'https://localhost',
        );
      }

      await expect(run).rejects.toThrowError(
        'Unauthorized No access token found in the session. Make sure your session is configured correctly and passed to `createCustomerClient`',
      );
    });

    it('Refreshes the token', async () => {
      (session.get as any).mockResolvedValue('value');

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

      await refreshToken(
        session,
        'customerAccountId',
        'customerAccountUrl',
        'https://localhost',
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
      expect(session.set).toHaveBeenNthCalledWith(3, 'id_token', 'id_token');
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
        await checkExpires(
          new Date().getTime() + 10000 + '',
          session,
          'customerAccountId',
          'customerAccountUrl',
          'https://localhost',
        );
      }

      expect(await run()).toBeUndefined();
    });

    it('Refreshes the token', async () => {
      (session.get as any).mockResolvedValue('value');

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

      await checkExpires(
        '100',
        session,
        'customerAccountId',
        'customerAccountUrl',
        'https://localhost',
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
      expect(session.set).toHaveBeenNthCalledWith(3, 'id_token', 'id_token');
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
});
