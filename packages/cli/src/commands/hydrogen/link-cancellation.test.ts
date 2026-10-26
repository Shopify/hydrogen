import {afterEach, expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  mkdir,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {listDevInstances} from '@shopify/cli-kit/node/dev-instance';
import {ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session';
import {graphqlRequest} from '@shopify/cli-kit/node/api/graphql';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderTextPrompt,
} from '@shopify/cli-kit/node/ui';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {
  createStorefront,
  type CreateStorefrontSchema,
} from '../../lib/graphql/admin/create-storefront.js';
import {getDevConfigInBackground} from '../../lib/dev-shared.js';
import {runDevSession} from '../../lib/dev-session.js';
import {deferPromise} from '../../lib/defer.js';
import {linkStorefront} from './link.js';

vi.mock('@shopify/cli-kit/node/session');
vi.mock('@shopify/cli-kit/node/api/graphql');
vi.mock('../../lib/graphql/admin/link-storefront.js');
vi.mock('../../lib/graphql/admin/create-storefront.js');
vi.mock('@shopify/cli-kit/node/ui', async (original) => ({
  ...(await original<typeof import('@shopify/cli-kit/node/ui')>()),
  renderConfirmationPrompt: vi.fn(),
  renderSelectPrompt: vi.fn(),
  renderTextPrompt: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

const session = {token: 'token', storeFqdn: 'example.myshopify.com'};
const config = {
  shop: session.storeFqdn,
  shopName: 'Example',
  email: 'developer@example.com',
};
const storefront = {
  id: 'gid://shopify/HydrogenStorefront/1',
  title: 'Example',
  productionUrl: 'https://example.com',
  parsedId: '1',
};

it.each(['selection', 'name', 'confirmation'] as const)(
  'cancels the %s prompt without creating or linking a storefront',
  async (stage) => {
    await inTemporaryDirectory(async (root) => {
      const initialConfig =
        stage === 'confirmation' ? {...config, storefront} : config;
      await mkdir(joinPath(root, '.shopify'));
      const configFile = joinPath(root, '.shopify/project.json');
      const contents = JSON.stringify(initialConfig);
      await writeFile(configFile, contents);
      const controller = new AbortController();
      const answer = deferPromise<any>();
      const prompt =
        stage === 'selection'
          ? renderSelectPrompt
          : stage === 'name'
            ? renderTextPrompt
            : renderConfirmationPrompt;
      vi.mocked(prompt).mockImplementationOnce(({abortSignal}) => {
        abortSignal!.addEventListener(
          'abort',
          () => answer.resolve(stage === 'name' ? '' : undefined),
          {once: true},
        );
        return answer.promise as Promise<any>;
      });
      const running = linkStorefront(root, session, initialConfig, {
        cliCommand: 'shopify hydrogen',
        storefronts: stage === 'name' ? [] : [storefront],
        signal: controller.signal,
      });
      const settled = running.catch(() => {});
      try {
        await vi.waitFor(() => expect(prompt).toHaveBeenCalledOnce());
        expect(vi.mocked(prompt).mock.calls[0]![0].abortSignal).toBe(
          controller.signal,
        );
        controller.abort();
        await expect(running).rejects.toBe(controller.signal.reason);
        expect(createStorefront).not.toHaveBeenCalled();
        expect(await readFile(configFile)).toBe(contents);
      } finally {
        controller.abort();
        await settled;
      }
    });
  },
);

it('retains ownership until storefront creation settles and skips linking after cancellation', async () => {
  await inTemporaryDirectory(async (root) => {
    await mkdir(joinPath(root, '.shopify'));
    const configFile = joinPath(root, '.shopify/project.json');
    const contents = JSON.stringify(config);
    await writeFile(configFile, contents);
    vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue(session);
    vi.mocked(getStorefronts).mockResolvedValue([]);
    vi.mocked(renderTextPrompt).mockResolvedValue('New storefront');
    const creating =
      deferPromise<Awaited<ReturnType<typeof createStorefront>>>();
    vi.mocked(createStorefront).mockReturnValue(
      creating.promise as Promise<Awaited<ReturnType<typeof createStorefront>>>,
    );
    const controller = new AbortController();
    const running = runDevSession(
      {
        command: 'hydrogen dev',
        directory: root,
        envFile: '.env',
        signal: controller.signal,
      },
      (session) => getDevConfigInBackground(root, true, '.env', session.signal),
    );
    const settled = running.catch(() => {});
    try {
      await vi.waitFor(() => expect(createStorefront).toHaveBeenCalledOnce());
      controller.abort();
      await expect(
        Promise.race([
          settled.then(() => 'finished'),
          new Promise<string>((resolve) =>
            setTimeout(() => resolve('pending'), 100),
          ),
        ]),
      ).resolves.toBe('pending');
      expect(await listDevInstances(root)).toHaveLength(1);
      creating.resolve({storefront, jobId: 'job'});
      await expect(running).resolves.toBeUndefined();
      expect(await listDevInstances(root)).toHaveLength(0);
      expect(await readFile(configFile)).toBe(contents);
    } finally {
      controller.abort();
      creating.resolve({storefront, jobId: 'job'});
      await settled;
    }
  });
});

it('aborts a pending storefront request and releases ownership without waiting for its response', async () => {
  await inTemporaryDirectory(async (root) => {
    await mkdir(joinPath(root, '.shopify'));
    const configFile = joinPath(root, '.shopify/project.json');
    const contents = JSON.stringify(config);
    await writeFile(configFile, contents);
    vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue(session);
    vi.mocked(getStorefronts).mockResolvedValue([]);
    vi.mocked(renderTextPrompt).mockResolvedValue('New storefront');
    const actual = await vi.importActual<
      typeof import('../../lib/graphql/admin/create-storefront.js')
    >('../../lib/graphql/admin/create-storefront.js');
    vi.mocked(createStorefront).mockImplementation(actual.createStorefront);
    const response = deferPromise<CreateStorefrontSchema>();
    let requestSignal: AbortSignal | undefined;
    vi.mocked(graphqlRequest).mockImplementation(async (options) => {
      const behaviour = options.preferredBehaviour;
      if (
        typeof behaviour === 'object' &&
        typeof behaviour.useAbortSignal === 'function'
      ) {
        requestSignal = behaviour.useAbortSignal() as AbortSignal;
      }
      return response.promise;
    });
    const controller = new AbortController();
    const running = runDevSession(
      {
        command: 'hydrogen dev',
        directory: root,
        envFile: '.env',
        signal: controller.signal,
      },
      (session) => getDevConfigInBackground(root, true, '.env', session.signal),
    );
    let finished = false;
    const settled = running.finally(() => (finished = true)).catch(() => {});
    const result = {
      hydrogenStorefrontCreate: {
        hydrogenStorefront: storefront,
        userErrors: [],
        jobId: 'job',
      },
    };
    try {
      await vi.waitFor(() => expect(graphqlRequest).toHaveBeenCalledOnce());
      controller.abort();
      await vi.waitFor(() => expect(finished).toBe(true));
      await expect(running).resolves.toBeUndefined();
      expect(requestSignal?.aborted).toBe(true);
      expect(await listDevInstances(root)).toHaveLength(0);
      response.resolve(result);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(await readFile(configFile)).toBe(contents);
    } finally {
      controller.abort();
      response.resolve(result);
      await settled;
    }
  });
});
