import {describe, it, expect, vi, afterEach} from 'vitest';
import {adminRequest} from './client.js';
import {getStorefronts, type LinkStorefrontSchema} from './link-storefront.js';

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
    const mockedResponse: LinkStorefrontSchema = {
      hydrogenStorefronts: [
        {
          id: 'gid://shopify/HydrogenStorefront/123',
          title: 'title',
          productionUrl: 'https://...',
        },
      ],
    };

    vi.mocked(adminRequest<LinkStorefrontSchema>).mockResolvedValue(
      mockedResponse,
    );

    await expect(getStorefronts(ADMIN_SESSION)).resolves.toStrictEqual([
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
