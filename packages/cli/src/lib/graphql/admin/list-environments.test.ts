import {describe, it, expect, vi, afterEach} from 'vitest';
import {adminRequest} from './client.js';
import {
  getStorefrontEnvironments,
  type ListEnvironmentsSchema,
} from './list-environments.js';
import {dummyListEnvironments} from './test-helper.js';

vi.mock('./client.js');

describe('getStorefrontEnvironments', () => {
  const ADMIN_SESSION = {
    token: 'abc123',
    storeFqdn: 'my-shop.myshopify.com',
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('calls the graphql client and returns Hydrogen storefronts', async () => {
    const mockedResponse: ListEnvironmentsSchema = {
      hydrogenStorefront: dummyListEnvironments(
        'gid://shopify/HydrogenStorefront/1',
      ),
    };

    vi.mocked(adminRequest<ListEnvironmentsSchema>).mockResolvedValue(
      mockedResponse,
    );

    const id = '123';

    await expect(
      getStorefrontEnvironments(ADMIN_SESSION, id),
    ).resolves.toStrictEqual(mockedResponse.hydrogenStorefront);

    expect(adminRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^#graphql.+query.+hydrogenStorefront\(/s),
      ADMIN_SESSION,
      {id},
    );
  });
});
