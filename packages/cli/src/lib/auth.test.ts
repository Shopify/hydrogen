import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest';
import {
  ensureAuthenticatedAdmin,
  ensureAuthenticatedBusinessPlatform,
} from '@shopify/cli-kit/node/session';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {login} from './auth.js';
import {getUserAccount} from './graphql/business-platform/user-account.js';
import {setUserAccount, getConfig} from './shopify-config.js';

vi.mock('@shopify/cli-kit/node/session');
vi.mock('@shopify/cli-kit/node/ui');
vi.mock('./graphql/business-platform/user-account.js');
vi.mock('./shopify-config.js');

describe('auth', () => {
  const EMAIL = 'email';
  const SHOP = 'my-shop';
  const SHOP_DOMAIN = SHOP + '.myshopify.com';
  const SHOP_NAME = 'My Shop';
  const TOKEN = 'abc123';
  const ROOT = 'path/to/project';

  const SHOPIFY_CONFIG = {
    shop: SHOP_DOMAIN,
    shopName: SHOP_NAME,
    email: EMAIL,
  };

  const EXPECTED_LOGIN_RESULT = {
    config: {shop: SHOP_DOMAIN, shopName: SHOP_NAME, email: EMAIL},
    session: {
      token: TOKEN,
      storeFqdn: SHOP_DOMAIN,
    },
  };

  beforeEach(() => {
    vi.mocked(setUserAccount).mockImplementation((_root, account) =>
      Promise.resolve(account),
    );
    vi.mocked(ensureAuthenticatedAdmin).mockImplementation((shop) =>
      Promise.resolve({token: TOKEN, storeFqdn: shop}),
    );
    vi.mocked(ensureAuthenticatedBusinessPlatform).mockResolvedValue('bp123');
    vi.mocked(getUserAccount).mockResolvedValue({
      email: 'email',
      activeShops: [{name: SHOP_NAME, fqdn: SHOP_DOMAIN}],
    });
    vi.mocked(getConfig).mockResolvedValue({});
    vi.mocked(renderSelectPrompt).mockResolvedValue({
      fqdn: SHOP_DOMAIN,
      name: SHOP_NAME,
    });
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

    it('reads shop from local config', async () => {
      vi.mocked(getConfig).mockResolvedValue(SHOPIFY_CONFIG);
      const result = await login(ROOT);

      expect(ensureAuthenticatedBusinessPlatform).not.toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setUserAccount).toHaveBeenCalledWith(
        ROOT,
        expect.objectContaining({shop: SHOP_DOMAIN}),
      );

      expect(result).toStrictEqual(EXPECTED_LOGIN_RESULT);
    });

    it('uses the shop flag argument when passed', async () => {
      const ANOTHER_SHOP = 'another-shop';
      const ANOTHER_SHOP_DOMAIN = 'another-shop.myshopify.com';
      const ANOTHER_SHOP_NAME = 'ANOTHER SHOP';

      vi.mocked(getConfig).mockResolvedValue(SHOPIFY_CONFIG);
      vi.mocked(renderSelectPrompt).mockResolvedValue({
        fqdn: ANOTHER_SHOP_DOMAIN,
        name: ANOTHER_SHOP_NAME,
      });

      const result = await login(ROOT, ANOTHER_SHOP);

      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(
        ANOTHER_SHOP_DOMAIN,
      );
      expect(setUserAccount).toHaveBeenCalledWith(
        ROOT,
        expect.objectContaining({shop: ANOTHER_SHOP_DOMAIN}),
      );

      expect(result).toStrictEqual({
        config: {
          shop: ANOTHER_SHOP_DOMAIN,
          shopName: ANOTHER_SHOP_NAME,
          email: EMAIL,
        },
        session: {
          storeFqdn: ANOTHER_SHOP_DOMAIN,
          token: TOKEN,
        },
      });
    });

    it('writes shop to local config and returns it with the admin session', async () => {
      const result = await login(ROOT, SHOP);

      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setUserAccount).toHaveBeenCalledWith(
        ROOT,
        expect.objectContaining({shop: SHOP_DOMAIN}),
      );

      expect(result).toStrictEqual(EXPECTED_LOGIN_RESULT);
    });

    it('prompts for shop is not found in arguments and local config', async () => {
      const result = await login(ROOT);

      expect(ensureAuthenticatedBusinessPlatform).toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setUserAccount).toHaveBeenCalledWith(
        ROOT,
        expect.objectContaining({shop: SHOP_DOMAIN}),
      );
      expect(renderSelectPrompt).toHaveBeenCalledWith({
        message: expect.any(String),
        choices: [
          {
            label: expect.stringContaining(SHOP_DOMAIN),
            value: {fqdn: SHOP_DOMAIN, name: SHOP_NAME},
          },
        ],
      });
      expect(result).toStrictEqual(EXPECTED_LOGIN_RESULT);
    });

    it('ignores local config and forces prompt when indicated', async () => {
      vi.mocked(getConfig).mockResolvedValue(SHOPIFY_CONFIG);

      const result = await login(ROOT, true);

      expect(ensureAuthenticatedBusinessPlatform).toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(setUserAccount).toHaveBeenCalledWith(
        ROOT,
        expect.objectContaining({shop: SHOP_DOMAIN}),
      );
      expect(renderSelectPrompt).toHaveBeenCalledWith({
        message: expect.any(String),
        choices: [
          {
            label: expect.stringContaining(SHOP_DOMAIN),
            value: {fqdn: SHOP_DOMAIN, name: SHOP_NAME},
          },
        ],
      });
      expect(result).toStrictEqual(EXPECTED_LOGIN_RESULT);
    });

    it('skips config steps when root argument is not passed', async () => {
      const result = await login();

      expect(ensureAuthenticatedBusinessPlatform).toHaveBeenCalled();
      expect(ensureAuthenticatedAdmin).toHaveBeenCalledWith(SHOP_DOMAIN);
      expect(getConfig).not.toHaveBeenCalled();
      expect(setUserAccount).not.toHaveBeenCalled();

      expect(result).toStrictEqual(EXPECTED_LOGIN_RESULT);
    });
  });
});
