import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {AdminSession} from '@shopify/cli-kit/node/session';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

import {
  ListStorefrontsQuery,
  ListStorefrontsSchema,
} from '../../lib/graphql/admin/list-storefronts.js';
import {getAdminSession} from '../../lib/admin-session.js';
import {adminRequest} from '../../lib/graphql.js';

import {formatDeployment, listStorefronts} from './list.js';

vi.mock('../../lib/admin-session.js');
vi.mock('../../lib/graphql.js', async () => {
  const original = await vi.importActual<typeof import('../../lib/graphql.js')>(
    '../../lib/graphql.js',
  );
  return {
    ...original,
    adminRequest: vi.fn(),
  };
});
vi.mock('../../lib/shop.js', () => ({
  getHydrogenShop: () => 'my-shop',
}));

describe('list', () => {
  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: 'my-shop',
  };

  beforeEach(async () => {
    vi.mocked(getAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(adminRequest<ListStorefrontsSchema>).mockResolvedValue({
      hydrogenStorefronts: [],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('makes a GraphQL call to fetch the storefronts', async () => {
    await listStorefronts({});

    expect(adminRequest).toHaveBeenCalledWith(
      ListStorefrontsQuery,
      ADMIN_SESSION,
    );
  });

  describe('and there are storefronts', () => {
    beforeEach(() => {
      vi.mocked(adminRequest<ListStorefrontsSchema>).mockResolvedValue({
        hydrogenStorefronts: [
          {
            id: 'gid://shopify/HydrogenStorefront/1',
            title: 'Hydrogen',
            productionUrl: 'https://example.com',
            currentProductionDeployment: null,
          },
          {
            id: 'gid://shopify/HydrogenStorefront/2',
            title: 'Demo Store',
            productionUrl: 'https://demo.example.com',
            currentProductionDeployment: {
              id: 'gid://shopify/HydrogenStorefrontDeployment/1',
              createdAt: '2023-03-22T22:28:38Z',
              commitMessage: 'Update README.md',
            },
          },
        ],
      });
    });

    it('renders a list of storefronts', async () => {
      const outputMock = mockAndCaptureOutput();

      await listStorefronts({});

      expect(outputMock.info()).toMatch(
        /Found 2 Hydrogen storefronts on my-shop/g,
      );
      expect(outputMock.info()).toMatch(
        /1   Hydrogen    https:\/\/example.com/g,
      );
      expect(outputMock.info()).toMatch(
        /2   Demo Store  https:\/\/demo.example.com  March 22, 2023, Update README.md/g,
      );
    });
  });

  describe('and there are no storefronts', () => {
    it('prompts the user to create a storefront', async () => {
      const outputMock = mockAndCaptureOutput();

      await listStorefronts({});

      expect(outputMock.info()).toMatch(
        /There are no Hydrogen storefronts on your Shop\./g,
      );
      expect(outputMock.info()).toMatch(/Create a new Hydrogen storefront/g);
      expect(outputMock.info()).toMatch(
        /https:\/\/my\-shop\/admin\/custom_storefronts\/new/g,
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
      'March 22, 2023, Update README.md',
    );
  });

  describe('when there is no commit message', () => {
    it('only returns the date', () => {
      const deployment = {
        id: 'gid://shopify/HydrogenStorefrontDeployment/1',
        createdAt,
        commitMessage: null,
      };

      expect(formatDeployment(deployment)).toStrictEqual('March 22, 2023');
    });
  });
});
