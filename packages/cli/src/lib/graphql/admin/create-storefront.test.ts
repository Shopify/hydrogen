import {describe, it, expect, vi, afterEach} from 'vitest';
import {adminRequest} from './client.js';
import {
  createStorefront,
  type CreateStorefrontSchema,
} from './create-storefront.js';

vi.mock('./client.js');

describe('createStorefront', () => {
  const ADMIN_SESSION = {
    token: 'abc123',
    storeFqdn: 'my-shop.myshopify.com',
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sends a mutation to create a new storefront and returns it', async () => {
    vi.mocked(adminRequest<CreateStorefrontSchema>).mockImplementation(
      (_, __, variables) =>
        Promise.resolve({
          hydrogenStorefrontCreate: {
            hydrogenStorefront: {
              id: 'gid://shopify/HydrogenStorefront/123',
              title: variables?.title,
              productionUrl: 'https://...',
            },
            userErrors: [],
            jobId: '123',
          },
        }),
    );

    const TITLE = 'title';

    await expect(createStorefront(ADMIN_SESSION, TITLE)).resolves.toStrictEqual(
      {
        jobId: '123',
        storefront: {
          id: 'gid://shopify/HydrogenStorefront/123',
          title: TITLE,
          productionUrl: 'https://...',
        },
      },
    );

    expect(adminRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^#graphql.+mutation.+hydrogenStorefrontCreate\(/s),
      ADMIN_SESSION,
      {title: TITLE},
    );
  });

  it('throws formatted GraphQL errors', async () => {
    const error = 'Title is invalid';
    vi.mocked(adminRequest<CreateStorefrontSchema>).mockResolvedValue({
      hydrogenStorefrontCreate: {
        jobId: undefined,
        hydrogenStorefront: undefined,
        userErrors: [
          {
            code: 'INVALID',
            field: ['title'],
            message: error,
          },
        ],
      },
    });

    await expect(createStorefront(ADMIN_SESSION, 'title')).rejects.toThrow(
      error,
    );
  });
});
