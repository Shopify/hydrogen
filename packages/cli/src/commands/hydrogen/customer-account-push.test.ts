import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {type AdminSession, login} from '../../lib/auth.js';
import {replaceCustomerApplicationUrls} from '../../lib/graphql/admin/customer-application-update.js';
import {setCustomerAccountConfig} from '../../lib/shopify-config.js';
import CustomerAccountPush, {
  runCustomerAccountPush,
  pushCustomerAccountConfig,
} from './customer-account-push.js';
import {captureJsonOutput} from '../../../tests/output.js';

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

  it('writes configured URLs as one JSON document through the command', async () => {
    const command = new CustomerAccountPush([], {} as any);
    const parse = vi.spyOn(command as any, 'parse').mockResolvedValue({
      flags: {
        json: true,
        'dev-origin': DEV_ORIGIN,
        'javascript-origin': JAVASCRIPT_ORIGIN,
        'relative-redirect-uri': '/custom/callback',
        'relative-logout-uri': '/logout',
      },
    });
    try {
      const {stdout, stderr} = await captureJsonOutput(() => command.run());
      expect(JSON.parse(stdout)).toEqual({
        storefrontGid: STOREFRONT_ID,
        redirectUri: `${DEV_ORIGIN}/custom/callback`,
        javascriptOrigin: JAVASCRIPT_ORIGIN,
        logoutUri: `${DEV_ORIGIN}/logout`,
      });
      expect(stderr).toBe('');
    } finally {
      parse.mockRestore();
    }
  });

  it('retains the dev server cleanup callback', async () => {
    const cleanup = await runCustomerAccountPush({devOrigin: DEV_ORIGIN});
    vi.mocked(replaceCustomerApplicationUrls).mockClear();
    await cleanup?.();
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

  it('propagates mutation errors without producing a success result', async () => {
    vi.mocked(replaceCustomerApplicationUrls).mockResolvedValue({
      success: false,
      userErrors: [],
    });
    await expect(
      pushCustomerAccountConfig({devOrigin: DEV_ORIGIN}),
    ).rejects.toThrow('setup update fail');
  });

  it('validates the public schema and advertises it in help', () => {
    expect(CustomerAccountPush.flags.json).toBeDefined();
    expect(CustomerAccountPush.description).toContain(
      CustomerAccountPush.jsonOutputSchema.name,
    );
    expect(() =>
      CustomerAccountPush.jsonOutputSchema.encode({
        storefrontId: 1,
        redirectUri: DEV_ORIGIN,
        javascriptOrigin: DEV_ORIGIN,
        logoutUri: DEV_ORIGIN,
      } as any),
    ).toThrow();
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
