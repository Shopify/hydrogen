import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {getOxygenDeploymentData} from './get-oxygen-deployment-data.js';
import {login} from './auth.js';
import {getConfig} from './shopify-config.js';
import {renderMissingLink, renderMissingStorefront} from './render-errors.js';
import {linkStorefront} from '../commands/hydrogen/link.js';
import {getOxygenData} from './graphql/admin/get-oxygen-data.js';

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');
  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
  };
});
vi.mock('./auth.js');
vi.mock('./admin-session.js');
vi.mock('./shopify-config.js');
vi.mock('./render-errors.js');
vi.mock('../commands/hydrogen/link.js');
vi.mock('./graphql/admin/get-oxygen-data.js');

describe('getOxygenDeploymentData', () => {
  const OXYGEN_DEPLOYMENT_TOKEN = 'a-lovely-token';
  const environments = [
    {
      name: 'production',
      branch: 'main',
    },
    {
      name: 'preview',
      branch: 'staging',
    },
  ];

  beforeEach(() => {
    vi.mocked(login).mockResolvedValue({
      session: {
        token: '123',
        storeFqdn: 'www.snowdevil.com',
      },
      config: {
        shop: 'snowdevil.myshopify.com',
        shopName: 'Snowdevil',
        email: 'merchant@shop.com',
        storefront: {
          id: '1',
          title: 'Snowboards',
        },
      },
    });
    vi.mocked(getConfig).mockResolvedValue({
      storefront: {id: 'storefront-id', title: 'Existing Link'},
    });
    vi.mocked(getOxygenData).mockResolvedValue({
      storefront: {
        deploymentToken: OXYGEN_DEPLOYMENT_TOKEN,
        environments,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns the oxygen deployment token and environments', async () => {
    const data = await getOxygenDeploymentData({root: 'test-root'});
    expect(data?.deploymentToken).toBe(OXYGEN_DEPLOYMENT_TOKEN);
    expect(data?.environments).toEqual(environments);
  });

  describe('when there is no linked storefront', () => {
    beforeEach(() => {
      vi.mocked(login).mockResolvedValue({
        session: {
          token: '123',
          storeFqdn: 'www.snowdevil.com',
        },
        config: {
          shop: 'snowdevil.myshopify.com',
          shopName: 'Snowdevil',
          email: 'merchant@shop.com',
          storefront: undefined,
        },
      });
    });

    it('calls renderMissingLink and prompts the user to create a link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);
      await getOxygenDeploymentData({root: 'test-root'});
      expect(renderMissingLink).toHaveBeenCalled();
      expect(renderConfirmationPrompt).toHaveBeenCalled();
      expect(linkStorefront).toHaveBeenCalled();
    });

    it('returns nothing if the user does not create a new link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);
      const token = await getOxygenDeploymentData({root: 'test-root'});
      expect(token).toEqual(undefined);
    });
  });

  describe('when there is no matching storefront in the shop', () => {
    beforeEach(() => {
      vi.mocked(getOxygenData).mockResolvedValue({storefront: null});
    });

    it('calls renderMissingStorefront and returns nothing', async () => {
      const token = await getOxygenDeploymentData({root: 'test-root'});
      expect(renderMissingStorefront).toHaveBeenCalled();
      expect(token).toEqual(undefined);
    });
  });

  describe('when the storefront does not have an oxygen deployment token', () => {
    beforeEach(() => {
      vi.mocked(getOxygenData).mockResolvedValue({
        storefront: {deploymentToken: '', environments: []},
      });
    });

    it('returns nothing', async () => {
      const data = await getOxygenDeploymentData({root: 'test-root'});
      expect(data).toEqual(undefined);
    });
  });
});
