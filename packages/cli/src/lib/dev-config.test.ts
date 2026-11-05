import {expect, it, vi} from 'vitest';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {getDevConfigInBackground} from './dev-shared.js';
import {login} from './auth.js';
import {linkStorefront} from '../commands/hydrogen/link.js';
import {deferPromise} from './defer.js';
import {abandonOnAbort} from './abort.js';

vi.mock('./auth.js');
vi.mock('../commands/hydrogen/link.js');

it('cancels a pending background login without linking after authentication finishes', async () => {
  await inTemporaryDirectory(async (root) => {
    const controller = new AbortController();
    const authenticated = deferPromise();
    vi.mocked(login).mockImplementationOnce(async (_root, _shop, signal) => {
      await abandonOnAbort(() => authenticated.promise, signal);
      return {
        session: {token: 'token', storeFqdn: 'example.myshopify.com'},
        config: {
          shop: 'example.myshopify.com',
          shopName: 'Example',
          email: 'developer@example.com',
        },
      };
    });
    const running = getDevConfigInBackground(
      root,
      true,
      '.env',
      controller.signal,
    );
    try {
      await vi.waitFor(() => expect(login).toHaveBeenCalledOnce());
      controller.abort();
      await expect(running).rejects.toBe(controller.signal.reason);
      authenticated.resolve();
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(linkStorefront).not.toHaveBeenCalled();
    } finally {
      controller.abort();
      authenticated.resolve();
      await running.catch(() => {});
    }
  });
});

it('does not begin a background login after cancellation', async () => {
  await inTemporaryDirectory(async (root) => {
    vi.mocked(login).mockClear();
    const signal = AbortSignal.abort();
    await expect(
      getDevConfigInBackground(root, true, '.env', signal),
    ).rejects.toBe(signal.reason);
    expect(login).not.toHaveBeenCalled();
  });
});

it('reads local variables without authenticating for mock.shop', async () => {
  await inTemporaryDirectory(async (root) => {
    vi.mocked(login).mockClear();
    await writeFile(joinPath(root, '.env'), 'PUBLIC_STORE_DOMAIN=mock.shop');
    await expect(
      getDevConfigInBackground(root, true, '.env'),
    ).resolves.toMatchObject({
      customerAccountPush: false,
      fetchRemote: false,
      localVariables: {PUBLIC_STORE_DOMAIN: 'mock.shop'},
    });
    expect(login).not.toHaveBeenCalled();
  });
});
