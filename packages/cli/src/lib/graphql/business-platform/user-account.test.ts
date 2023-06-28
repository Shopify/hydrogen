import {describe, it, expect, vi, afterEach} from 'vitest';
import {businessPlatformRequest} from '@shopify/cli-kit/node/api/business-platform';
import {getUserAccount, type UserAccountSchema} from './user-account.js';

vi.mock('@shopify/cli-kit/node/api/business-platform');

describe('getUserAccount', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('fetches the current user account and merges destinations', async () => {
    vi.mocked(businessPlatformRequest<UserAccountSchema>).mockResolvedValue({
      currentUserAccount: {
        email: 'email',
        organizations: {
          edges: [
            {
              node: {
                id: 'gid://shopify/Organization/123',
                name: 'name',
                categories: [
                  {
                    destinations: {
                      edges: [
                        {
                          node: {
                            name: 'n1',
                            webUrl: 'w1',
                            status: 'ACTIVE',
                          },
                        },
                      ],
                      pageInfo: {} as any,
                    },
                  },
                ],
              },
            },
          ],
          pageInfo: {} as any,
        },
        orphanDestinations: {
          categories: [
            {
              destinations: {
                edges: [
                  {
                    node: {
                      name: 'n2',
                      webUrl: 'w2',
                      status: 'NOPE',
                    },
                  },
                  {
                    node: {
                      name: 'n3',
                      webUrl: 'w3',
                      status: 'ACTIVE',
                    },
                  },
                ],
                pageInfo: {} as any,
              },
            },
          ],
        },
      },
    });

    await expect(getUserAccount('123')).resolves.toStrictEqual({
      email: 'email',
      activeShops: [
        {name: 'n1', fqdn: 'w1'},
        {name: 'n3', fqdn: 'w3'},
      ],
    });

    expect(businessPlatformRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^#graphql.+query.+currentUserAccount\s*{/s),
      '123',
    );
  });
});
