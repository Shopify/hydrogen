import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {
  getStorefrontEnvironments,
  type Environment,
} from '../../../lib/graphql/admin/list-environments.js';
import {type AdminSession, login} from '../../../lib/auth.js';
import {
  renderMissingLink,
  renderMissingStorefront,
} from '../../../lib/render-errors.js';
import {linkStorefront} from '../link.js';
import {runEnvList} from './list.js';

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
vi.mock('../../../lib/auth.js');
vi.mock('../../../lib/shopify-config.js');
vi.mock('../../../lib/render-errors.js');
vi.mock('../../../lib/graphql/admin/list-environments.js');
vi.mock('../../../lib/shell.js', () => ({getCliCommand: () => 'h2'}));

describe('listEnvironments', () => {
  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: SHOP,
  };

  const SHOPIFY_CONFIG = {
    storefront: {
      id: 'gid://shopify/HydrogenStorefront/1',
      title: 'Existing Link',
    },
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
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: SHOPIFY_CONFIG,
    });

    vi.mocked(getStorefrontEnvironments).mockResolvedValue({
      id: 'gid://shopify/HydrogenStorefront/1',
      productionUrl: 'https://example.com',
      environments: [
        PRODUCTION_ENVIRONMENT,
        CUSTOM_ENVIRONMENT,
        PREVIEW_ENVIRONMENT,
      ],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('fetchs environment variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await runEnvList({path: tmpDir});

      expect(getStorefrontEnvironments).toHaveBeenCalledWith(
        ADMIN_SESSION,
        SHOPIFY_CONFIG.storefront.id,
      );
    });
  });

  it('lists the environments', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const output = mockAndCaptureOutput();

      await runEnvList({path: tmpDir});

      expect(output.info()).toMatch(
        /Showing 3 environments for the Hydrogen storefront Existing Link/i,
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
      vi.mocked(login).mockResolvedValue({
        session: ADMIN_SESSION,
        config: {},
      });
    });

    it('calls renderMissingLink', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvList({path: tmpDir});

        expect(renderMissingLink).toHaveBeenCalledOnce();
      });
    });

    it('prompts the user to create a link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvList({path: tmpDir});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          message: expect.arrayContaining([{command: 'h2 link'}]),
        });

        expect(linkStorefront).toHaveBeenCalledWith(
          tmpDir,
          ADMIN_SESSION,
          {},
          expect.anything(),
        );
      });
    });
  });

  describe('when there is no matching storefront in the shop', () => {
    beforeEach(() => {
      vi.mocked(getStorefrontEnvironments).mockResolvedValue(null);
    });

    it('calls renderMissingStorefront', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvList({path: tmpDir});

        expect(renderMissingStorefront).toHaveBeenCalledOnce();
      });
    });
  });
});
