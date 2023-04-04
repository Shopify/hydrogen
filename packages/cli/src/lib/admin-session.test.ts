import {describe, it, expect, vi, afterEach} from 'vitest';
import {ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session';
import type {AdminSession} from '@shopify/cli-kit/node/session';
import {AbortError} from '@shopify/cli-kit/node/error';

import {getAdminSession} from './admin-session.js';

describe('list', () => {
  vi.mock('@shopify/cli-kit/node/session');

  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: 'my-shop',
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns the admin session', async () => {
    vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue(ADMIN_SESSION);

    const adminSession = await getAdminSession('my-shop');

    expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith('my-shop');

    expect(adminSession).toStrictEqual(ADMIN_SESSION);
  });

  describe('when it fails to authenticate', () => {
    it('throws an error', async () => {
      vi.mocked(ensureAuthenticatedAdmin).mockRejectedValue({});

      await expect(getAdminSession('my-shop')).rejects.toThrow(AbortError);
    });
  });
});
