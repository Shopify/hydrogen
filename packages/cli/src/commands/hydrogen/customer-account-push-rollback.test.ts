import {afterEach, expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  mkdir,
  readFile,
  removeFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {login} from '../../lib/auth.js';
import {replaceCustomerApplicationUrls} from '../../lib/graphql/admin/customer-application-update.js';
import {pushCustomerAccountConfig} from './customer-account-push.js';

vi.mock('../../lib/auth.js');
vi.mock('../../lib/graphql/admin/customer-application-update.js');
afterEach(() => vi.resetAllMocks());

const storefrontId = 'gid://shopify/HydrogenStorefront/1';
const devOrigin = 'https://new.example';
const previousConfig = {
  redirectUri: 'https://previous.example/account/authorize',
  javascriptOrigin: 'https://previous.example',
  logoutUri: 'https://previous.example',
};

it.each<{
  description: string;
  previous: Partial<typeof previousConfig> | undefined;
  targetStorefrontId?: string;
  cancel?: boolean;
}>([
  {description: 'different URLs', previous: previousConfig},
  {
    description: 'unchanged URLs',
    previous: {
      redirectUri: `${devOrigin}/account/authorize`,
      javascriptOrigin: devOrigin,
      logoutUri: devOrigin,
    },
  },
  {
    description: 'partial previous config',
    previous: {javascriptOrigin: previousConfig.javascriptOrigin},
  },
  {description: 'no previous config', previous: undefined},
  {
    description: 'a different target storefront',
    previous: previousConfig,
    targetStorefrontId: 'gid://shopify/HydrogenStorefront/2',
  },
  {description: 'cancellation', previous: previousConfig, cancel: true},
])(
  'restores remote URLs after a failed push with $description',
  async ({previous, targetStorefrontId = storefrontId, cancel = false}) => {
    await inTemporaryDirectory(async (root) => {
      const config = {
        shop: 'example.myshopify.com',
        shopName: 'Example',
        email: 'developer@example.com',
        storefront: {
          id: storefrontId,
          title: 'Example',
          customerAccountConfig: previous,
        },
      };
      await mkdir(joinPath(root, '.shopify'));
      const configFile = joinPath(root, '.shopify/project.json');
      const contents = JSON.stringify(config);
      await writeFile(configFile, contents);
      vi.mocked(login).mockResolvedValue({
        session: {token: 'token', storeFqdn: config.shop},
        config,
      });

      const targetConfig =
        targetStorefrontId === storefrontId ? previous : undefined;
      const originalUrls = {
        redirectUri: [
          'https://unrelated.example',
          targetConfig?.redirectUri,
        ].filter(Boolean) as string[],
        javascriptOrigin: [
          'https://unrelated.example',
          targetConfig?.javascriptOrigin,
        ].filter(Boolean) as string[],
        logoutUris: [
          'https://unrelated.example',
          targetConfig?.logoutUri,
        ].filter(Boolean) as string[],
      };
      const remoteUrls = {
        redirectUri: new Set(originalUrls.redirectUri),
        javascriptOrigin: new Set(originalUrls.javascriptOrigin),
        logoutUris: new Set(originalUrls.logoutUris),
      };
      const controller = new AbortController();
      const cancellationReason = new Error('Cancelled');
      let mutations = 0;
      vi.mocked(replaceCustomerApplicationUrls).mockImplementation(
        async (_session, target, input, requestSignal) => {
          expect(target).toBe(targetStorefrontId);
          for (const field of [
            'redirectUri',
            'javascriptOrigin',
            'logoutUris',
          ] as const) {
            const replacement = input[field];
            if (replacement?.removeRegex) {
              const pattern = new RegExp(replacement.removeRegex);
              for (const url of remoteUrls[field]) {
                if (pattern.test(url)) remoteUrls[field].delete(url);
              }
            }
            for (const url of replacement?.add ?? [])
              remoteUrls[field].add(url);
          }
          if (++mutations === 1) {
            if (cancel) controller.abort(cancellationReason);
            else await removeFile(configFile);
          }
          // The server can commit before the client observes cancellation.
          requestSignal?.throwIfAborted();
          return {success: true, userErrors: []};
        },
      );

      const running = pushCustomerAccountConfig({
        path: root,
        storefrontId: targetStorefrontId,
        devOrigin,
        signal: controller.signal,
      });
      if (cancel) await expect(running).rejects.toBe(cancellationReason);
      else await expect(running).rejects.toThrow('setup update fail');
      expect(mutations).toBe(2);
      for (const field of [
        'redirectUri',
        'javascriptOrigin',
        'logoutUris',
      ] as const) {
        expect([...remoteUrls[field]].sort()).toEqual(
          originalUrls[field].sort(),
        );
      }
      if (cancel) expect(await readFile(configFile)).toBe(contents);
    });
  },
);

it('does not start a URL mutation when cancelled during login', async () => {
  await inTemporaryDirectory(async (root) => {
    const controller = new AbortController();
    const reason = new Error('Cancelled');
    vi.mocked(login).mockImplementation(async () => {
      controller.abort(reason);
      return {
        session: {token: 'token', storeFqdn: 'example.myshopify.com'},
        config: {
          shop: 'example.myshopify.com',
          shopName: 'Example',
          email: 'developer@example.com',
          storefront: {id: storefrontId, title: 'Example'},
        },
      };
    });
    await expect(
      pushCustomerAccountConfig({
        path: root,
        storefrontId,
        devOrigin,
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
    expect(replaceCustomerApplicationUrls).not.toHaveBeenCalled();
  });
});
