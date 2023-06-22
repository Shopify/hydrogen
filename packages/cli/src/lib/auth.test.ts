import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest';
import {
  ensureAuthenticatedAdmin,
  ensureAuthenticatedBusinessPlatform,
} from '@shopify/cli-kit/node/session';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {login, type AdminSession} from './auth.js';
import {getActiveShops} from './graphql/business-platform/active-shops.js';
import {setShop, getConfig} from './shopify-config.js';

vi.mock('@shopify/cli-kit/node/session');
vi.mock('@shopify/cli-kit/node/ui');
vi.mock('./graphql/business-platform/active-shops.js');
vi.mock('./shopify-config.js');

describe('auth', () => {
  const SHOP = 'my-shop';
  const SHOP_DOMAIN = 'my-shop.myshopify.com';

  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: SHOP_DOMAIN,
  };
  const SHOPIFY_CONFIG = {shop: SHOP_DOMAIN};

  const root = '';

  beforeEach(() => {
    vi.mocked(setShop).mockResolvedValue(SHOPIFY_CONFIG);
    vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(ensureAuthenticatedBusinessPlatform).mockResolvedValue('bp123');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('throws an error when it fails to authenticate', async () => {
      vi.mocked(ensureAuthenticatedBusinessPlatform).mockRejectedValueOnce({});
      await expect(login(root)).rejects.toThrow(AbortError);

      vi.mocked(ensureAuthenticatedAdmin).mockRejectedValueOnce({});
      await expect(login(root, SHOP)).rejects.toThrow(AbortError);
    });

    it('writes shop to local config and returns it with the admin session', async () => {
      const result = await login(root, SHOP);

      expect(ensureAuthenticatedBusinessPlatform).not.toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(root, SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: SHOPIFY_CONFIG,
        session: ADMIN_SESSION,
      });
    });

    it('reads shop from local config when indicated', async () => {
      vi.mocked(getConfig).mockResolvedValue(SHOPIFY_CONFIG);
      const result = await login(root, true);

      expect(ensureAuthenticatedBusinessPlatform).not.toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(
        SHOPIFY_CONFIG.shop,
      );
      expect(setShop).toHaveBeenCalledWith(root, SHOPIFY_CONFIG.shop);

      expect(result).toStrictEqual({
        config: SHOPIFY_CONFIG,
        session: ADMIN_SESSION,
      });
    });

    it('prompts for shop when not passed in the arguments', async () => {
      const ANOTHER_SHOP = 'another-shop';
      const ANOTHER_SHOP_DOMAIN = ANOTHER_SHOP + '.myshopify.com';

      vi.mocked(getActiveShops).mockResolvedValue([
        {name: ANOTHER_SHOP, fqdn: ANOTHER_SHOP_DOMAIN},
      ]);
      vi.mocked(renderSelectPrompt).mockResolvedValue(ANOTHER_SHOP_DOMAIN);
      vi.mocked(setShop).mockResolvedValue({shop: ANOTHER_SHOP_DOMAIN});
      vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue({
        ...ADMIN_SESSION,
        storeFqdn: ANOTHER_SHOP_DOMAIN,
      });

      const result = await login(root);

      expect(renderSelectPrompt).toHaveBeenCalledWith({
        message: expect.any(String),
        choices: [
          {
            label: expect.stringContaining(ANOTHER_SHOP_DOMAIN),
            value: ANOTHER_SHOP_DOMAIN,
          },
        ],
      });

      expect(ensureAuthenticatedBusinessPlatform).toHaveBeenCalled();
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
