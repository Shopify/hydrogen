import {afterEach, expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  mkdir,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session';
import {login} from './auth.js';
import {deferPromise} from './defer.js';
import {getAllEnvironmentVariables} from './environment-variables.js';
import {setUserAccount} from './shopify-config.js';

vi.mock('@shopify/cli-kit/node/session');
vi.mock('./shopify-config.js', async (original) => {
  const actual = await original<typeof import('./shopify-config.js')>();
  return {...actual, setUserAccount: vi.fn(actual.setUserAccount)};
});
afterEach(() => vi.resetAllMocks());

it.each(['login', 'environment loading'] as const)(
  'does not write project config when %s authentication completes after cancellation',
  async (operation) => {
    await inTemporaryDirectory(async (root) => {
      await mkdir(joinPath(root, '.shopify'));
      const configFile = joinPath(root, '.shopify/project.json');
      const contents = JSON.stringify({
        shop: 'example.myshopify.com',
        shopName: 'Example',
        email: 'developer@example.com',
      });
      await writeFile(configFile, contents);
      const authenticated =
        deferPromise<Awaited<ReturnType<typeof ensureAuthenticatedAdmin>>>();
      vi.mocked(ensureAuthenticatedAdmin).mockReturnValue(
        authenticated.promise as Promise<
          Awaited<ReturnType<typeof ensureAuthenticatedAdmin>>
        >,
      );
      const controller = new AbortController();
      const running =
        operation === 'login'
          ? login(root, undefined, controller.signal)
          : getAllEnvironmentVariables({
              root,
              envFile: '.env',
              signal: controller.signal,
            });
      const settled = running.catch(() => {});
      try {
        await vi.waitFor(() =>
          expect(ensureAuthenticatedAdmin).toHaveBeenCalledOnce(),
        );
        controller.abort();
        const completed = vi.fn();
        void settled.then(completed);
        await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
        await expect(running).rejects.toBe(controller.signal.reason);
        const updatedContents = JSON.stringify({
          ...JSON.parse(contents),
          shopName: 'Updated',
        });
        await writeFile(configFile, updatedContents);
        authenticated.resolve({
          token: 'token',
          storeFqdn: 'example.myshopify.com',
        });
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(setUserAccount).not.toHaveBeenCalled();
        expect(await readFile(configFile)).toBe(updatedContents);
      } finally {
        controller.abort();
        authenticated.resolve({
          token: 'token',
          storeFqdn: 'example.myshopify.com',
        });
        await settled;
      }
    });
  },
);
