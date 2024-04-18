import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';

import {getStorefrontEnvironments} from '../../../lib/graphql/admin/list-environments.js';
import {dummyListEnvironments} from '../../../lib/graphql/admin/test-helper.js';
import {type AdminSession, login} from '../../../lib/auth.js';
import {renderMissingStorefront} from '../../../lib/render-errors.js';
import {runEnvList} from './list.js';
import {verifyLinkedStorefront} from '../../../lib/verify-linked-storefront.js';

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
vi.mock('../../../lib/verify-linked-storefront.js');
vi.mock('../../../lib/shell.js', () => ({getCliCommand: () => 'h2'}));

describe('listEnvironments', () => {
  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: SHOP,
  };

  const SHOPIFY_CONFIG = {
    shop: SHOP,
    shopName: 'My Shop',
    email: 'email',
    storefront: {
      id: 'gid://shopify/HydrogenStorefront/1',
      title: 'Existing Link',
    },
  };

  beforeEach(async () => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: SHOPIFY_CONFIG,
    });

    vi.mocked(verifyLinkedStorefront).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      title: SHOPIFY_CONFIG.storefront.title,
      productionUrl: 'https://my-shop.myshopify.com',
    });

    vi.mocked(getStorefrontEnvironments).mockResolvedValue(
      dummyListEnvironments(SHOPIFY_CONFIG.storefront.id),
    );
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

      expect(output.info()).toMatch(
        /Production \(handle: production, branch: main\)/,
      );
      expect(output.info()).toMatch(/https:\/\/my-shop\.myshopify\.com/);
      expect(output.info()).toMatch(
        /Staging \(handle: staging, branch: staging\)/,
      );
      expect(output.info()).toMatch(/https:\/\/oxygen-456\.example\.com/);
      expect(output.info()).toMatch(/Preview \(handle: preview\)/);
    });
  });

  describe('when there is no linked storefront', () => {
    beforeEach(() => {
      vi.mocked(verifyLinkedStorefront).mockResolvedValue(undefined);
    });

    it("doesn't list any environments", async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const output = mockAndCaptureOutput();

        await runEnvList({path: tmpDir});

        expect(output.info()).toBe('');
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
