import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {AdminSession} from '../../lib/auth.js';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {getStorefrontsWithDeployment} from '../../lib/graphql/admin/list-storefronts.js';
import {formatDeployment, runList} from './list.js';
import {login} from '../../lib/auth.js';

vi.mock('../../lib/auth.js');
vi.mock('../../lib/graphql/admin/list-storefronts.js');

describe('list', () => {
  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: 'my-shop',
  };

  const SHOPIFY_CONFIG = {
    shop: 'my-shop.myshopify.com',
    storefront: {
      id: 'gid://shopify/HydrogenStorefront/1',
      title: 'Hydrogen',
    },
  };

  beforeEach(async () => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: SHOPIFY_CONFIG,
    });

    vi.mocked(getStorefrontsWithDeployment).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('fetches the storefronts', async () => {
    await runList({});

    expect(getStorefrontsWithDeployment).toHaveBeenCalledWith(ADMIN_SESSION);
  });

  describe('and there are storefronts', () => {
    beforeEach(() => {
      vi.mocked(getStorefrontsWithDeployment).mockResolvedValue([
        {
          id: 'gid://shopify/HydrogenStorefront/1',
          parsedId: '1',
          title: 'Hydrogen',
          productionUrl: 'https://example.com',
          currentProductionDeployment: null,
        },
        {
          id: 'gid://shopify/HydrogenStorefront/2',
          parsedId: '2',
          title: 'Demo Store',
          productionUrl: 'https://demo.example.com',
          currentProductionDeployment: {
            id: 'gid://shopify/HydrogenStorefrontDeployment/1',
            createdAt: '2023-03-22T22:28:38Z',
            commitMessage: 'Update README.md',
          },
        },
      ]);
    });

    it('renders a list of storefronts', async () => {
      const outputMock = mockAndCaptureOutput();

      await runList({});

      expect(outputMock.info()).toMatch(
        /Showing 2 Hydrogen storefronts for the store my-shop/i,
      );
      expect(outputMock.info()).toMatch(/Hydrogen \(id: 1\)/);
      expect(outputMock.info()).toMatch(/https:\/\/example.com/);
      expect(outputMock.info()).toMatch(/Demo Store \(id: 2\)/);
      expect(outputMock.info()).toMatch(/https:\/\/demo.example.com/);
      expect(outputMock.info()).toMatch(/3\/22\/2023, Update README.md/);
    });
  });

  describe('and there are no storefronts', () => {
    it('prompts the user to create a storefront', async () => {
      const outputMock = mockAndCaptureOutput();

      await runList({});

      expect(outputMock.info()).toMatch(
        /There are no Hydrogen storefronts on your Shop\./i,
      );
      expect(outputMock.info()).toMatch(/Create a new Hydrogen storefront/i);
      expect(outputMock.info()).toMatch(
        /https:\/\/my\-shop\/admin\/custom_storefronts\/new/,
      );
    });
  });
});

describe('formatDeployment', () => {
  const createdAt = '2023-03-22T22:28:38Z';

  it('returns a string combined with a date and commit message', () => {
    const deployment = {
      id: 'gid://shopify/HydrogenStorefrontDeployment/1',
      createdAt,
      commitMessage:
        'Update README.md\n\nThis is a description of why the change was made.',
    };

    expect(formatDeployment(deployment)).toStrictEqual(
      '3/22/2023, Update README.md',
    );
  });

  describe('when there is no commit message', () => {
    it('only returns the date', () => {
      const deployment = {
        id: 'gid://shopify/HydrogenStorefrontDeployment/1',
        parsedId: '1',
        createdAt,
        commitMessage: null,
      };

      expect(formatDeployment(deployment)).toStrictEqual('3/22/2023');
    });
  });
});
