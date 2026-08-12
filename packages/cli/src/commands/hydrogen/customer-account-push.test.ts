import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {type AdminSession, login} from '../../lib/auth.js';
import {replaceCustomerApplicationUrls} from '../../lib/graphql/admin/customer-application-update.js';
import {setCustomerAccountConfig} from '../../lib/shopify-config.js';
import {runCustomerAccountPush} from './customer-account-push.js';

vi.mock('../../lib/auth.js');
vi.mock('../../lib/graphql/admin/customer-application-update.js');
vi.mock('../../lib/shopify-config.js');

const ADMIN_SESSION: AdminSession = {
  token: 'token',
  storeFqdn: 'example.myshopify.com',
};
const STOREFRONT_ID = 'gid://shopify/HydrogenStorefront/1';
const DEV_ORIGIN = 'https://localtest.me:5173';
const JAVASCRIPT_ORIGIN = 'https://localtest.me';
const PREVIOUS_CONFIG = {
  redirectUri: 'https://previous.example/account/authorize',
  javascriptOrigin: 'https://previous.example',
  logoutUri: 'https://previous.example',
};
const SHOPIFY_CONFIG = {
  shop: 'example.myshopify.com',
  shopName: 'Example',
  email: 'developer@example.com',
  storefront: {
    id: STOREFRONT_ID,
    title: 'Example storefront',
    customerAccountConfig: PREVIOUS_CONFIG,
  },
};

describe('runCustomerAccountPush', () => {
  beforeEach(() => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: SHOPIFY_CONFIG,
    });
    vi.mocked(replaceCustomerApplicationUrls).mockResolvedValue({
      success: true,
      userErrors: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('defaults the JavaScript origin to the development origin', async () => {
    await runCustomerAccountPush({devOrigin: DEV_ORIGIN});

    expect(replaceCustomerApplicationUrls).toHaveBeenCalledWith(
      ADMIN_SESSION,
      STOREFRONT_ID,
      expect.objectContaining({
        javascriptOrigin: expect.objectContaining({add: [DEV_ORIGIN]}),
      }),
    );
  });

  it('uses the JavaScript origin override with portful redirect and logout URIs', async () => {
    await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      javascriptOrigin: JAVASCRIPT_ORIGIN,
    });

    expect(replaceCustomerApplicationUrls).toHaveBeenCalledWith(
      ADMIN_SESSION,
      STOREFRONT_ID,
      {
        redirectUri: {
          add: [`${DEV_ORIGIN}/account/authorize`],
          removeRegex: PREVIOUS_CONFIG.redirectUri,
        },
        javascriptOrigin: {
          add: [JAVASCRIPT_ORIGIN],
          removeRegex: PREVIOUS_CONFIG.javascriptOrigin,
        },
        logoutUris: {
          add: [DEV_ORIGIN],
          removeRegex: PREVIOUS_CONFIG.logoutUri,
        },
      },
    );
  });

  it('persists the overridden JavaScript origin', async () => {
    await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      javascriptOrigin: JAVASCRIPT_ORIGIN,
    });

    expect(setCustomerAccountConfig).toHaveBeenCalledWith(process.cwd(), {
      redirectUri: `${DEV_ORIGIN}/account/authorize`,
      javascriptOrigin: JAVASCRIPT_ORIGIN,
      logoutUri: DEV_ORIGIN,
    });
  });

  it('removes the previously stored JavaScript origin', async () => {
    await runCustomerAccountPush({
      devOrigin: DEV_ORIGIN,
      javascriptOrigin: JAVASCRIPT_ORIGIN,
    });

    expect(replaceCustomerApplicationUrls).toHaveBeenCalledWith(
      ADMIN_SESSION,
      STOREFRONT_ID,
      expect.objectContaining({
        javascriptOrigin: expect.objectContaining({
          removeRegex: PREVIOUS_CONFIG.javascriptOrigin,
        }),
      }),
    );
  });
});
