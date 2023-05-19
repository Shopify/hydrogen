import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {AdminSession} from '@shopify/cli-kit/node/session';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {
  PullVariablesQuery,
  PullVariablesSchema,
} from './graphql/admin/pull-variables.js';
import {getAdminSession} from './admin-session.js';
import {adminRequest} from './graphql.js';
import {getConfig} from './shopify-config.js';
import {renderMissingLink, renderMissingStorefront} from './render-errors.js';
import {linkStorefront} from '../commands/hydrogen/link.js';

import {pullRemoteEnvironmentVariables} from './pull-environment-variables.js';

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');
  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
  };
});
vi.mock('../commands/hydrogen/link.js');
vi.mock('./admin-session.js');
vi.mock('./shopify-config.js');
vi.mock('./render-errors.js');
vi.mock('./graphql.js', async () => {
  const original = await vi.importActual<typeof import('./graphql.js')>(
    './graphql.js',
  );
  return {
    ...original,
    adminRequest: vi.fn(),
  };
});
vi.mock('./shop.js', () => ({
  getHydrogenShop: () => 'my-shop',
}));

describe('pullRemoteEnvironmentVariables', () => {
  const ENVIRONMENT_VARIABLES_RESPONSE = [
    {
      id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
      key: 'PUBLIC_API_TOKEN',
      value: 'abc123',
      isSecret: false,
    },
  ];

  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: 'my-shop',
  };

  beforeEach(async () => {
    vi.mocked(getAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getConfig).mockResolvedValue({
      storefront: {
        id: 'gid://shopify/HydrogenStorefront/2',
        title: 'Existing Link',
      },
    });
    vi.mocked(adminRequest<PullVariablesSchema>).mockResolvedValue({
      hydrogenStorefront: {
        id: 'gid://shopify/HydrogenStorefront/1',
        environmentVariables: ENVIRONMENT_VARIABLES_RESPONSE,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('makes a GraphQL call to fetch environment variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await pullRemoteEnvironmentVariables({
        root: tmpDir,
        envBranch: 'staging',
      });

      expect(adminRequest).toHaveBeenCalledWith(
        PullVariablesQuery,
        ADMIN_SESSION,
        {
          id: 'gid://shopify/HydrogenStorefront/2',
          branch: 'staging',
        },
      );
    });
  });

  it('returns environment variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const environmentVariables = await pullRemoteEnvironmentVariables({
        root: tmpDir,
      });

      expect(environmentVariables).toBe(ENVIRONMENT_VARIABLES_RESPONSE);
    });
  });

  describe('when environment variables are empty', () => {
    beforeEach(() => {
      vi.mocked(adminRequest<PullVariablesSchema>).mockResolvedValue({
        hydrogenStorefront: {
          id: 'gid://shopify/HydrogenStorefront/1',
          environmentVariables: [],
        },
      });
    });

    it('renders a message', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const outputMock = mockAndCaptureOutput();

        await pullRemoteEnvironmentVariables({root: tmpDir});

        expect(outputMock.info()).toMatch(/No environment variables found\./);
      });
    });

    it('returns an empty array', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const environmentVariables = await pullRemoteEnvironmentVariables({
          root: tmpDir,
        });

        expect(environmentVariables).toStrictEqual([]);
      });
    });
  });

  describe('when there is no linked storefront', () => {
    beforeEach(() => {
      vi.mocked(getConfig).mockResolvedValue({
        storefront: undefined,
      });
    });

    it('calls renderMissingLink', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await pullRemoteEnvironmentVariables({root: tmpDir});

        expect(renderMissingLink).toHaveBeenCalledOnce();
      });
    });

    it('prompts the user to create a link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

      await inTemporaryDirectory(async (tmpDir) => {
        await pullRemoteEnvironmentVariables({root: tmpDir});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          message: expect.stringMatching(/Run .*npx shopify hydrogen link.*\?/),
        });

        expect(linkStorefront).toHaveBeenCalledWith({
          path: tmpDir,
        });
      });
    });

    describe('and the user does not create a new link', () => {
      it('returns an empty array', async () => {
        vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);

        await inTemporaryDirectory(async (tmpDir) => {
          const environmentVariables = await pullRemoteEnvironmentVariables({
            root: tmpDir,
          });

          expect(environmentVariables).toStrictEqual([]);
        });
      });
    });
  });

  describe('when there is no matching storefront in the shop', () => {
    beforeEach(() => {
      vi.mocked(adminRequest<PullVariablesSchema>).mockResolvedValue({
        hydrogenStorefront: null,
      });
    });

    it('calls renderMissingStorefront', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await pullRemoteEnvironmentVariables({root: tmpDir});

        expect(renderMissingStorefront).toHaveBeenCalledOnce();
      });
    });

    it('returns an empty array', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const environmentVariables = await pullRemoteEnvironmentVariables({
          root: tmpDir,
        });

        expect(environmentVariables).toStrictEqual([]);
      });
    });
  });
});
