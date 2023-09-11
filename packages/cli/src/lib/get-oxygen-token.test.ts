import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {getOxygenDeploymentToken} from './get-oxygen-token.js';
import {login} from './auth.js';
import {getCliCommand} from './shell.js';
import {getConfig} from './shopify-config.js';
import {renderMissingLink, renderMissingStorefront} from './render-errors.js';
import {linkStorefront} from '../commands/hydrogen/link.js';
import {getOxygenToken} from './graphql/admin/oxygen-token.js';

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
vi.mock('./graphql/admin/oxygen-token.js');

describe('getOxygenDeploymentToken', () => {
  const OXYGEN_DEPLOYMENT_TOKEN = 'a-lovely-token';

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
    vi.mocked(getOxygenToken).mockResolvedValue({
      storefront: {oxygenDeploymentToken: OXYGEN_DEPLOYMENT_TOKEN},
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns the oxygen deployment token', async () => {
    const token = await getOxygenDeploymentToken({root: 'test-root'});
    expect(token).toBe(OXYGEN_DEPLOYMENT_TOKEN);
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
      await getOxygenDeploymentToken({root: 'test-root'});
      expect(renderMissingLink).toHaveBeenCalled();
      expect(renderConfirmationPrompt).toHaveBeenCalled();
      expect(linkStorefront).toHaveBeenCalled();
    });

    it('returns nothing if the user does not create a new link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);
      const token = await getOxygenDeploymentToken({root: 'test-root'});
      expect(token).toEqual(undefined);
    });
  });

  describe('when there is no matching storefront in the shop', () => {
    beforeEach(() => {
      vi.mocked(getOxygenToken).mockResolvedValue({storefront: null});
    });

    it('calls renderMissingStorefront and returns nothing', async () => {
      const token = await getOxygenDeploymentToken({root: 'test-root'});
      expect(renderMissingStorefront).toHaveBeenCalled();
      expect(token).toEqual(undefined);
    });
  });

  describe('when the storefront does not have an oxygen deployment token', () => {
    beforeEach(() => {
      vi.mocked(getOxygenToken).mockResolvedValue({
        storefront: {oxygenDeploymentToken: ''},
      });
    });

    it('returns nothing', async () => {
      const token = await getOxygenDeploymentToken({root: 'test-root'});
      expect(token).toEqual(undefined);
    });
  });
});
