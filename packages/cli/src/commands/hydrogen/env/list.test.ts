import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {AdminSession} from '@shopify/cli-kit/node/session';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {
  getStorefrontEnvironments,
  type Environment,
} from '../../../lib/graphql/admin/list-environments.js';
import {getAdminSession} from '../../../lib/admin-session.js';
import {getConfig} from '../../../lib/shopify-config.js';
import {
  renderMissingLink,
  renderMissingStorefront,
} from '../../../lib/render-errors.js';
import {linkStorefront} from '../link.js';
import {listEnvironments} from './list.js';

const SHOP = 'my-shop';

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
vi.mock('../../../lib/render-errors.js');
vi.mock('../../../lib/graphql/admin/list-environments.js', () => {
  return {getStorefrontEnvironments: vi.fn()};
});
vi.mock('../../../lib/shop.js', () => ({
  getHydrogenShop: () => SHOP,
}));

describe('listEnvironments', () => {
  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: SHOP,
  };

  const PRODUCTION_ENVIRONMENT: Environment = {
    id: 'gid://shopify/HydrogenStorefrontEnvironment/1',
    branch: 'main',
    type: 'PRODUCTION',
    name: 'Production',
    createdAt: '2023-02-16T22:35:42Z',
    url: 'https://oxygen-123.example.com',
  };

  const CUSTOM_ENVIRONMENT: Environment = {
    id: 'gid://shopify/HydrogenStorefrontEnvironment/3',
    branch: 'staging',
    type: 'CUSTOM',
    name: 'Staging',
    createdAt: '2023-05-08T20:52:29Z',
    url: 'https://oxygen-456.example.com',
  };

  const PREVIEW_ENVIRONMENT: Environment = {
    id: 'gid://shopify/HydrogenStorefrontEnvironment/2',
    branch: null,
    type: 'PREVIEW',
    name: 'Preview',
    createdAt: '2023-02-16T22:35:42Z',
    url: null,
  };

  beforeEach(async () => {
    vi.mocked(getAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getConfig).mockResolvedValue({
      storefront: {
        id: 'gid://shopify/HydrogenStorefront/1',
        title: 'Existing Link',
      },
    });
    vi.mocked(getStorefrontEnvironments).mockResolvedValue({
      storefront: {
        id: 'gid://shopify/HydrogenStorefront/1',
        productionUrl: 'https://example.com',
        environments: [
          PRODUCTION_ENVIRONMENT,
          CUSTOM_ENVIRONMENT,
          PREVIEW_ENVIRONMENT,
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
      await listEnvironments({path: tmpDir});

      expect(getStorefrontEnvironments).toHaveBeenCalledWith(
        ADMIN_SESSION,
        'gid://shopify/HydrogenStorefront/1',
      );
    });
  });

  it('lists the environments', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const output = mockAndCaptureOutput();

      await listEnvironments({path: tmpDir});

      expect(output.info()).toMatch(
        /Showing 3 environments for the Hydrogen storefront Existing Link/,
      );

      expect(output.info()).toMatch(/Production \(Branch: main\)/);
      expect(output.info()).toMatch(/https:\/\/example\.com/);
      expect(output.info()).toMatch(/Staging \(Branch: staging\)/);
      expect(output.info()).toMatch(/https:\/\/oxygen-456\.example\.com/);
      expect(output.info()).toMatch(/Preview/);
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
        await listEnvironments({path: tmpDir});

        expect(renderMissingLink).toHaveBeenCalledOnce();
      });
    });

    it('prompts the user to create a link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

      await inTemporaryDirectory(async (tmpDir) => {
        await listEnvironments({path: tmpDir});

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
      vi.mocked(getStorefrontEnvironments).mockResolvedValue({
        storefront: null,
      });
    });

    it('calls renderMissingStorefront', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await listEnvironments({path: tmpDir});

        expect(renderMissingStorefront).toHaveBeenCalledOnce();
      });
    });
  });
});
