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
import {AbortError} from '@shopify/cli-kit/node/error';
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
import type {JobSchema} from '../../lib/graphql/admin/fetch-job.js';
import * as storefrontJobs from '../../lib/graphql/admin/fetch-job.js';

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

it('retains ownership until storefront creation settles and saves its identity after cancellation', async () => {
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
      expect(JSON.parse(await readFile(configFile))).toEqual({
        ...config,
        storefront: {id: storefront.id, title: storefront.title},
      });
      expect(await getDevConfigInBackground(root, true, '.env')).toMatchObject({
        storefrontId: storefront.id,
      });
      expect(createStorefront).toHaveBeenCalledOnce();
    } finally {
      controller.abort();
      creating.resolve({storefront, jobId: 'job'});
      await settled;
    }
  });
});

it('saves a committed storefront after cancellation while waiting for the mutation response', async () => {
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
    let remoteStorefront: typeof storefront | undefined;
    let requestSignal: AbortSignal | undefined;
    vi.mocked(graphqlRequest).mockImplementation(async (options) => {
      remoteStorefront = storefront;
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
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(finished).toBe(false);
      expect(requestSignal).toBeUndefined();
      expect(await listDevInstances(root)).toHaveLength(1);
      response.resolve(result);
      await expect(running).resolves.toBeUndefined();
      expect(await listDevInstances(root)).toHaveLength(0);
      expect(JSON.parse(await readFile(configFile)).storefront).toEqual({
        id: remoteStorefront!.id,
        title: remoteStorefront!.title,
      });
      expect(await getDevConfigInBackground(root, true, '.env')).toMatchObject({
        storefrontId: storefront.id,
      });
      expect(graphqlRequest).toHaveBeenCalledOnce();
    } finally {
      controller.abort();
      response.resolve(result);
      await settled;
    }
  });
});

it.each(['prompt', 'name'] as const)(
  'keeps the created storefront linked when API token polling is cancelled using %s',
  async (selection) => {
    await inTemporaryDirectory(async (root) => {
      await mkdir(joinPath(root, '.shopify'));
      const configFile = joinPath(root, '.shopify/project.json');
      await writeFile(configFile, JSON.stringify(config));
      vi.mocked(ensureAuthenticatedAdmin).mockResolvedValue(session);
      vi.mocked(createStorefront).mockResolvedValue({storefront, jobId: 'job'});
      vi.mocked(renderSelectPrompt).mockResolvedValue(null);
      vi.mocked(renderTextPrompt).mockResolvedValue('New storefront');
      const response = deferPromise<JobSchema>();
      vi.mocked(graphqlRequest).mockImplementation(
        async () => response.promise,
      );
      const controller = new AbortController();
      const running = runDevSession(
        {
          command: 'hydrogen dev',
          directory: root,
          envFile: '.env',
          signal: controller.signal,
        },
        ({signal}) =>
          linkStorefront(root, session, config, {
            cliCommand: 'shopify hydrogen',
            storefronts: [],
            storefrontName: selection === 'name' ? 'New storefront' : undefined,
            signal,
          }),
      );
      const settled = running.catch(() => {});
      try {
        await vi.waitFor(() => expect(graphqlRequest).toHaveBeenCalledOnce());
        expect(JSON.parse(await readFile(configFile))).toEqual(config);
        controller.abort();
        await expect(running).resolves.toBeUndefined();
        expect(await listDevInstances(root)).toHaveLength(0);
        expect(JSON.parse(await readFile(configFile)).storefront).toEqual({
          id: storefront.id,
          title: storefront.title,
        });
        expect(
          await getDevConfigInBackground(root, true, '.env'),
        ).toMatchObject({
          storefrontId: storefront.id,
        });
        expect(createStorefront).toHaveBeenCalledOnce();
      } finally {
        controller.abort();
        response.resolve({
          hydrogenStorefrontJob: {id: 'job', done: true, errors: []},
        });
        await settled;
      }
    });
  },
);

it.each(['provisioning', 'network'] as const)(
  'preserves the previous link when a %s failure races with cancellation',
  async (failure) => {
    await inTemporaryDirectory(async (root) => {
      await mkdir(joinPath(root, '.shopify'));
      const configFile = joinPath(root, '.shopify/project.json');
      const previousConfig = {
        ...config,
        storefront: {
          id: 'gid://shopify/HydrogenStorefront/previous',
          title: 'Previous storefront',
          customerAccountConfig: {redirectUri: 'https://previous.example.com'},
        },
      };
      const contents = JSON.stringify(previousConfig, null, 2) + '\n';
      await writeFile(configFile, contents);
      vi.mocked(createStorefront).mockResolvedValue({storefront, jobId: 'job'});
      const controller = new AbortController();
      const error =
        failure === 'provisioning'
          ? new AbortError('Storefront setup failed')
          : new Error('Network unavailable');
      const polling = vi
        .spyOn(storefrontJobs, 'waitForJob')
        .mockImplementationOnce(async () => {
          controller.abort();
          throw error;
        });
      try {
        await expect(
          linkStorefront(root, session, previousConfig, {
            force: true,
            storefrontName: 'New storefront',
            cliCommand: 'shopify hydrogen',
            storefronts: [storefront],
            signal: controller.signal,
          }),
        ).rejects.toBe(error);
        expect(controller.signal.aborted).toBe(true);
        expect(await readFile(configFile)).toBe(contents);
      } finally {
        polling.mockRestore();
      }
    });
  },
);

it.each(['provisioning', 'network'] as const)(
  'preserves the previous link when storefront %s fails without cancellation',
  async (failure) => {
    await inTemporaryDirectory(async (root) => {
      await mkdir(joinPath(root, '.shopify'));
      const configFile = joinPath(root, '.shopify/project.json');
      const previousConfig = {
        ...config,
        storefront: {
          id: 'gid://shopify/HydrogenStorefront/previous',
          title: 'Previous storefront',
          customerAccountConfig: {redirectUri: 'https://previous.example.com'},
        },
      };
      const contents = JSON.stringify(previousConfig, null, 2) + '\n';
      await writeFile(configFile, contents);
      vi.mocked(createStorefront).mockResolvedValue({storefront, jobId: 'job'});
      const message = `${failure} failed`;
      if (failure === 'network') {
        vi.mocked(graphqlRequest).mockRejectedValue(new Error(message));
      } else {
        vi.mocked(graphqlRequest).mockResolvedValue({
          hydrogenStorefrontJob: {
            id: 'job',
            done: true,
            errors: [{code: 'FAILURE', message}],
          },
        });
      }
      await expect(
        linkStorefront(root, session, previousConfig, {
          force: true,
          storefrontName: 'New storefront',
          cliCommand: 'shopify hydrogen',
          storefronts: [storefront],
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow(message);
      expect(await readFile(configFile)).toBe(contents);
    });
  },
);
