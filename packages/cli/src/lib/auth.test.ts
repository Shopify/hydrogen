import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest';
import {ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session';
import {renderTextPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {login} from './auth.js';
import {getConfig, setShop} from './shopify-config.js';

vi.mock('@shopify/cli-kit/node/session');
vi.mock('@shopify/cli-kit/node/ui');
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('throws an error when it fails to authenticate', async () => {
      vi.mocked(ensureAuthenticatedAdmin).mockRejectedValue({});

      await expect(login(ROOT, SHOP)).rejects.toThrow(AbortError);
    });

    it('reads shop from local config when passing boolean', async () => {
      vi.mocked(getConfig).mockResolvedValue({shop: SHOP_DOMAIN});
      const result = await login(ROOT, true);

      expect(getConfig).toHaveBeenCalledWith(ROOT);
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(ROOT, SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: {token: TOKEN, storeFqdn: SHOP_DOMAIN},
      });
    });

    it('writes shop to local config and returns it with the admin session', async () => {
      const result = await login(ROOT, SHOP);

      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(ROOT, SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: {token: TOKEN, storeFqdn: SHOP_DOMAIN},
      });
    });

    it('prompts for shop when not passed in the arguments', async () => {
      vi.mocked(renderTextPrompt).mockResolvedValue(SHOP);

      const result = await login(ROOT);

      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setShop).toHaveBeenCalledWith(ROOT, SHOP_DOMAIN);

      expect(result).toStrictEqual({
        config: {shop: SHOP_DOMAIN},
        session: {
          token: TOKEN,
          storeFqdn: SHOP_DOMAIN,
        },
      });
    });

    it('skips config steps when root argument is not passed', async () => {
      vi.mocked(renderTextPrompt).mockResolvedValue(SHOP);

      const result = await login();

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
