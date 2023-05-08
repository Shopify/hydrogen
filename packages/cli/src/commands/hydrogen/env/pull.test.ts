import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {AdminSession} from '@shopify/cli-kit/node/session';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {
  fileExists,
  inTemporaryDirectory,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {
  PullVariablesQuery,
  PullVariablesSchema,
} from '../../../lib/graphql/admin/pull-variables.js';
import {getAdminSession} from '../../../lib/admin-session.js';
import {adminRequest} from '../../../lib/graphql.js';
import {getConfig} from '../../../lib/shopify-config.js';
import {linkStorefront} from '../link.js';

import {pullVariables} from './pull.js';

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');
  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
  };
});
vi.mock('../link.js');
vi.mock('../../../lib/admin-session.js');
vi.mock('../../../lib/shopify-config.js');
vi.mock('../../../lib/graphql.js', async () => {
  const original = await vi.importActual<
    typeof import('../../../lib/graphql.js')
  >('../../../lib/graphql.js');
  return {
    ...original,
    adminRequest: vi.fn(),
  };
});
vi.mock('../../../lib/shop.js', () => ({
  getHydrogenShop: () => 'my-shop',
}));

describe('pullVariables', () => {
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
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'PUBLIC_API_TOKEN',
            value: 'abc123',
            isSecret: false,
          },
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'PRIVATE_API_TOKEN',
            value: '',
            isSecret: true,
          },
        ],
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('makes a GraphQL call to fetch environment variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await pullVariables({path: tmpDir});

      expect(adminRequest).toHaveBeenCalledWith(
        PullVariablesQuery,
        ADMIN_SESSION,
        {
          id: 'gid://shopify/HydrogenStorefront/2',
        },
      );
    });
  });

  it('writes environment variables to a .env file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, '.env');

      expect(await fileExists(filePath)).toBeFalsy();

      await pullVariables({path: tmpDir});

      expect(await readFile(filePath)).toStrictEqual(
        'PUBLIC_API_TOKEN="abc123"\n' +
          '# PRIVATE_API_TOKEN is marked as secret and its value is hidden\n' +
          'PRIVATE_API_TOKEN=""\n',
      );
    });
  });

  it('warns if there are any variables marked as secret', async () => {
    vi.mocked(adminRequest<PullVariablesSchema>).mockResolvedValue({
      hydrogenStorefront: {
        id: 'gid://shopify/HydrogenStorefront/1',
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'PRIVATE_API_TOKEN',
            value: '',
            isSecret: true,
          },
        ],
      },
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await pullVariables({path: tmpDir});

      expect(outputMock.warn()).toStrictEqual(
        'Existing Link contains environment variables marked as ' +
          'secret, so their values weren’t pulled.',
      );
    });
  });

  describe('when a .env file already exists', () => {
    beforeEach(() => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);
    });

    it('prompts the user to confirm', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, '.env');
        await writeFile(filePath, 'EXISTING_TOKEN=1');

        await pullVariables({path: tmpDir});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          message: expect.stringMatching(
            /Warning: \.env file already exists\. Do you want to overwrite it\?/,
          ),
        });
      });
    });

    describe('and --force is enabled', () => {
      it('does not prompt the user to confirm', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          const filePath = joinPath(tmpDir, '.env');
          await writeFile(filePath, 'EXISTING_TOKEN=1');

          await pullVariables({path: tmpDir, force: true});

          expect(renderConfirmationPrompt).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('when there are no environment variables to update', () => {
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

        await pullVariables({path: tmpDir});

        expect(outputMock.info()).toMatch(
          /No Preview environment variables found\./,
        );
      });
    });
  });

  describe('when there is no linked storefront', () => {
    beforeEach(() => {
      vi.mocked(getConfig).mockResolvedValue({
        storefront: undefined,
      });
    });

    it('renders an error message', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const outputMock = mockAndCaptureOutput();

        await pullVariables({path: tmpDir});

        expect(outputMock.error()).toMatch(
          /No linked Hydrogen storefront on my-shop/,
        );
      });
    });

    it('prompts the user to create a link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

      await inTemporaryDirectory(async (tmpDir) => {
        await pullVariables({path: tmpDir});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          message: expect.stringMatching(/Run .*npx shopify hydrogen link.*\?/),
        });

        expect(linkStorefront).toHaveBeenCalledWith({
          path: tmpDir,
          silent: true,
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

    it('renders an error message', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const outputMock = mockAndCaptureOutput();

        await pullVariables({path: tmpDir});

        expect(outputMock.error()).toMatch(
          /Couldn’t find Hydrogen storefront\./,
        );
      });
    });
  });
});
