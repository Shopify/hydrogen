import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest';
import {ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session';
import {renderTextPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {login, type AdminSession} from './auth.js';
import {setShop} from './shopify-config.js';

vi.mock('@shopify/cli-kit/node/session');
vi.mock('@shopify/cli-kit/node/ui');
vi.mock('./shopify-config.js');

describe('auth', () => {
  const SHOP = 'my-shop';
  const SHOP_DOMAIN = 'my-shop.myshopify.com';

  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: SHOP_DOMAIN,
  };

  const root = '';

  beforeEach(() => {
    vi.mocked(setShop).mockResolvedValue({shop: SHOP_DOMAIN});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('throws an error when it fails to authenticate', async () => {
      vi.mocked(ensureAuthenticatedAdmin).mockRejectedValue({});

      await expect(login(root, SHOP)).rejects.toThrow(AbortError);
    });

    it('writes shop to local config and returns it with the admin session', async () => {
      vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue(ADMIN_SESSION);

      const result = await login(root, SHOP);

      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(root, SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: ADMIN_SESSION,
      });
    });

    it('prompts for shop when not passed in the arguments', async () => {
      const ANOTHER_SHOP = 'another-shop';
      const ANOTHER_SHOP_DOMAIN = ANOTHER_SHOP + '.myshopify.com';

      vi.mocked(renderTextPrompt).mockResolvedValue(ANOTHER_SHOP);
      vi.mocked(setShop).mockResolvedValue({shop: ANOTHER_SHOP_DOMAIN});
      vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue({
        ...ADMIN_SESSION,
        storeFqdn: ANOTHER_SHOP_DOMAIN,
      });

      const result = await login(root);

      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(
        ANOTHER_SHOP_DOMAIN,
      );
      expect(setShop).toHaveBeenCalledWith(root, ANOTHER_SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: {shop: ANOTHER_SHOP_DOMAIN},
        session: {
          ...ADMIN_SESSION,
          storeFqdn: ANOTHER_SHOP_DOMAIN,
        },
      });
    });
  });
});
