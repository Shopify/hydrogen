import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest';
import {
  ensureAuthenticatedAdmin,
  ensureAuthenticatedBusinessPlatform,
} from '@shopify/cli-kit/node/session';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {login} from './auth.js';
import {getActiveShops} from './graphql/business-platform/active-shops.js';
import {setShop, getConfig} from './shopify-config.js';

vi.mock('@shopify/cli-kit/node/session');
vi.mock('@shopify/cli-kit/node/ui');
vi.mock('./graphql/business-platform/active-shops.js');
vi.mock('./shopify-config.js');

describe('auth', () => {
  const SHOP = 'my-shop';
  const SHOP_DOMAIN = SHOP + '.myshopify.com';
  const TOKEN = 'abc123';
  const ROOT = 'path/to/project';

  beforeEach(() => {
    vi.mocked(setShop).mockImplementation((root, shop) =>
      Promise.resolve({shop}),
    );
    vi.mocked(ensureAuthenticatedAdmin).mockImplementation((shop) =>
      Promise.resolve({token: TOKEN, storeFqdn: shop}),
    );
    vi.mocked(ensureAuthenticatedBusinessPlatform).mockResolvedValue('bp123');
    vi.mocked(getActiveShops).mockResolvedValue([
      {name: SHOP, fqdn: SHOP_DOMAIN},
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('throws an error when it fails to authenticate', async () => {
      vi.mocked(ensureAuthenticatedBusinessPlatform).mockRejectedValueOnce({});
      await expect(login(ROOT)).rejects.toThrow(AbortError);

      vi.mocked(ensureAuthenticatedAdmin).mockRejectedValueOnce({});
      await expect(login(ROOT, SHOP)).rejects.toThrow(AbortError);
    });

    it('reads shop from local config when passing boolean', async () => {
      vi.mocked(getConfig).mockResolvedValue({shop: SHOP_DOMAIN});
      const result = await login(ROOT, true);

      expect(getConfig).toHaveBeenCalledWith(ROOT);
      expect(ensureAuthenticatedBusinessPlatform).not.toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(ROOT, SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: {token: TOKEN, storeFqdn: SHOP_DOMAIN},
      });
    });

    it('writes shop to local config and returns it with the admin session', async () => {
      const result = await login(ROOT, SHOP);

      expect(ensureAuthenticatedBusinessPlatform).not.toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(ROOT, SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: {token: TOKEN, storeFqdn: SHOP_DOMAIN},
      });
    });

    it('prompts for shop when not passed in the arguments', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue(SHOP_DOMAIN);

      const result = await login(ROOT);

      expect(ensureAuthenticatedBusinessPlatform).toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(ROOT, SHOP_DOMAIN);
      expect(renderSelectPrompt).toHaveBeenCalledWith({
        message: expect.any(String),
        choices: [
          {
            label: expect.stringContaining(SHOP_DOMAIN),
            value: SHOP_DOMAIN,
          },
        ],
      });
      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: {
          token: TOKEN,
          storeFqdn: SHOP_DOMAIN,
        },
      });
    });

    it('skips config steps when root argument is not passed', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue(SHOP_DOMAIN);

      const result = await login();

      expect(ensureAuthenticatedBusinessPlatform).toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(getConfig).not.toHaveBeenCalled();
      expect(setShop).not.toHaveBeenCalled();

      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: {
          token: TOKEN,
          storeFqdn: SHOP_DOMAIN,
        },
      });
    });
  });
});
