import {describe, it, expect, vi, afterEach} from 'vitest';
import {adminRequest} from './client.js';
import {
  getStorefrontsWithDeployment,
  type ListStorefrontsSchema,
} from './list-storefronts.js';

vi.mock('./client.js');

describe('getStorefrontsWithDeployment', () => {
  const ADMIN_SESSION = {
    token: 'abc123',
    storeFqdn: 'my-shop.myshopify.com',
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('calls the graphql client and returns Hydrogen storefronts', async () => {
    const mockedResponse: ListStorefrontsSchema = {
      hydrogenStorefronts: [
        {
          id: 'gid://shopify/HydrogenStorefront/123',
          title: 'title',
          currentProductionDeployment: {
            id: 'd123',
            createdAt: '2021-01-01T00:00:00Z',
            commitMessage: null,
          },
        },
      ],
    };

    vi.mocked(adminRequest<ListStorefrontsSchema>).mockResolvedValue(
      mockedResponse,
    );

    await expect(
      getStorefrontsWithDeployment(ADMIN_SESSION),
    ).resolves.toStrictEqual([
      {
        ...mockedResponse.hydrogenStorefronts[0],
        parsedId: '123',
      },
    ]);

    expect(adminRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^#graphql.+query.+hydrogenStorefronts\s*{/s),
      ADMIN_SESSION,
    );
  });
});
