import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {type AdminSession, login} from '../../../lib/auth.js';
import {replaceCustomerApplicationUrls} from '../../../lib/graphql/admin/customer-application-update.js';
import {
  getConfig,
  setCustomerAccountConfig,
} from '../../../lib/shopify-config.js';
import {linkStorefront} from '../link.js';
import {runCustomerAccountPush, getStorefrontId} from './push.js';
import {AbortError} from '@shopify/cli-kit/node/error';

vi.mock('../../../lib/auth.js');
vi.mock('../../../lib/graphql/admin/customer-application-update.js');
vi.mock('../../../lib/shopify-config.js');
vi.mock('../link.js');
vi.mock('../../../lib/shell.js', () => ({getCliCommand: () => 'h2'}));

const ADMIN_SESSION: AdminSession = {
  token: 'abc123',
  storeFqdn: 'my-shop.myshopify.com',
};

const STOREFRONT_ID = 'gid://shopify/HydrogenStorefront/1';

const SHOPIFY_CONFIG = {
  shop: 'my-shop.myshopify.com',
  shopName: 'My Shop',
  email: 'dev@example.com',
  storefront: {
    id: STOREFRONT_ID,
    title: 'Hydrogen',
  },
};

const DEV_ORIGIN = 'https://abc123.tryhydrogen.dev';

beforeEach(() => {
  vi.mocked(login).mockResolvedValue({
    session: ADMIN_SESSION,
    config: SHOPIFY_CONFIG,
  });

  vi.mocked(replaceCustomerApplicationUrls).mockResolvedValue({
    success: true,
    userErrors: [],
  });

  vi.mocked(setCustomerAccountConfig).mockResolvedValue(undefined as any);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('runCustomerAccountPush', () => {
  it('adds URLs without removing existing ones', async () => {
    await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      storefrontId: STOREFRONT_ID,
    });

    expect(replaceCustomerApplicationUrls).toHaveBeenCalledWith(
      ADMIN_SESSION,
      STOREFRONT_ID,
      {
        redirectUri: {add: [`${DEV_ORIGIN}/account/authorize`]},
        javascriptOrigin: {add: [DEV_ORIGIN]},
        logoutUris: {add: [DEV_ORIGIN]},
      },
    );
  });

  it('does not send removeRegex during push', async () => {
    await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      storefrontId: STOREFRONT_ID,
    });

    const callArgs = vi.mocked(replaceCustomerApplicationUrls).mock.calls[0]!;
    const urlsInput = callArgs[2];

    expect(urlsInput.redirectUri).not.toHaveProperty('removeRegex');
    expect(urlsInput.javascriptOrigin).not.toHaveProperty('removeRegex');
    expect(urlsInput.logoutUris).not.toHaveProperty('removeRegex');
  });

  it('uses custom relative redirect and logout URIs', async () => {
    await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      storefrontId: STOREFRONT_ID,
      redirectUriRelativeUrl: '/custom/callback',
      logoutUriRelativeUrl: '/custom/logout',
    });

    const callArgs = vi.mocked(replaceCustomerApplicationUrls).mock.calls[0]!;
    const urlsInput = callArgs[2];

    expect(urlsInput.redirectUri).toEqual({
      add: [`${DEV_ORIGIN}/custom/callback`],
    });
    expect(urlsInput.logoutUris).toEqual({
      add: [`${DEV_ORIGIN}/custom/logout`],
    });
  });

  it('persists pushed URLs to local config', async () => {
    await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      storefrontId: STOREFRONT_ID,
    });

    expect(setCustomerAccountConfig).toHaveBeenCalledWith(expect.any(String), {
      redirectUri: `${DEV_ORIGIN}/account/authorize`,
      javascriptOrigin: DEV_ORIGIN,
      logoutUri: DEV_ORIGIN,
    });
  });

  it('returns a cleanup function that removes only this session URLs', async () => {
    const cleanup = await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      storefrontId: STOREFRONT_ID,
    });

    expect(cleanup).toBeTypeOf('function');

    vi.mocked(replaceCustomerApplicationUrls).mockClear();

    await cleanup!();

    expect(replaceCustomerApplicationUrls).toHaveBeenCalledWith(
      ADMIN_SESSION,
      STOREFRONT_ID,
      {
        redirectUri: {removeRegex: `${DEV_ORIGIN}/account/authorize`},
        javascriptOrigin: {removeRegex: DEV_ORIGIN},
        logoutUris: {removeRegex: DEV_ORIGIN},
      },
    );
  });

  it('cleanup does not send add fields', async () => {
    const cleanup = await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      storefrontId: STOREFRONT_ID,
    });

    vi.mocked(replaceCustomerApplicationUrls).mockClear();

    await cleanup!();

    const callArgs = vi.mocked(replaceCustomerApplicationUrls).mock.calls[0]!;
    const urlsInput = callArgs[2];

    expect(urlsInput.redirectUri).not.toHaveProperty('add');
    expect(urlsInput.javascriptOrigin).not.toHaveProperty('add');
    expect(urlsInput.logoutUris).not.toHaveProperty('add');
  });

  it('throws AbortError when mutation returns userErrors', async () => {
    vi.mocked(replaceCustomerApplicationUrls).mockResolvedValue({
      success: false,
      userErrors: [
        {message: 'Invalid URL', field: ['redirectUri'], code: 'INVALID'},
      ],
    });

    await expect(
      runCustomerAccountPush({
        devOrigin: DEV_ORIGIN,
        storefrontId: STOREFRONT_ID,
      }),
    ).rejects.toThrow(AbortError);
  });

  it('throws AbortError with confidential access hint when applicable', async () => {
    vi.mocked(replaceCustomerApplicationUrls).mockResolvedValue({
      success: false,
      userErrors: [
        {
          message: 'Javascript origin is not allowed for this application type',
          field: ['javascriptOrigin'],
          code: 'INVALID',
        },
      ],
    });

    await expect(
      runCustomerAccountPush({
        devOrigin: DEV_ORIGIN,
        storefrontId: STOREFRONT_ID,
      }),
    ).rejects.toThrow(AbortError);
  });

  it('throws AbortError when no storefrontId is available', async () => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: {
        ...SHOPIFY_CONFIG,
        storefront: undefined,
      },
    });

    await expect(
      runCustomerAccountPush({
        devOrigin: DEV_ORIGIN,
      }),
    ).rejects.toThrow(AbortError);
  });

  it('skips mutation when all URLs are empty', async () => {
    const result = await runCustomerAccountPush({
      devOrigin: '',
      storefrontId: STOREFRONT_ID,
      redirectUriRelativeUrl: '',
    });

    expect(result).toBeUndefined();
    expect(replaceCustomerApplicationUrls).not.toHaveBeenCalled();
  });
});

describe('getStorefrontId', () => {
  it('returns storefrontId from flag when provided', async () => {
    const result = await getStorefrontId('/tmp', STOREFRONT_ID);

    expect(result).toBe(STOREFRONT_ID);
    expect(login).not.toHaveBeenCalled();
  });

  it('returns storefrontId from config when no flag', async () => {
    const result = await getStorefrontId('/tmp');

    expect(result).toBe(STOREFRONT_ID);
  });

  it('falls back to interactive linking when config has no storefront', async () => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: {
        shop: 'my-shop.myshopify.com',
        shopName: 'My Shop',
        email: 'dev@example.com',
      },
    });

    vi.mocked(linkStorefront).mockResolvedValue({
      id: STOREFRONT_ID,
      title: 'Linked Store',
      productionUrl: 'https://example.com',
    });

    vi.mocked(getConfig).mockResolvedValue({
      storefront: {id: STOREFRONT_ID, title: 'Linked Store'},
    });

    const result = await getStorefrontId('/tmp');

    expect(linkStorefront).toHaveBeenCalled();
    expect(result).toBe(STOREFRONT_ID);
  });

  it('returns undefined when linking is cancelled', async () => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: {
        shop: 'my-shop.myshopify.com',
        shopName: 'My Shop',
        email: 'dev@example.com',
      },
    });

    vi.mocked(linkStorefront).mockResolvedValue(undefined as any);
    vi.mocked(getConfig).mockResolvedValue({});

    const result = await getStorefrontId('/tmp');

    expect(result).toBeUndefined();
  });
});
