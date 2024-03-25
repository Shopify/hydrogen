import {describe, it, expect, vi, afterEach} from 'vitest';
import {adminRequest} from './client.js';
import {
  getStorefrontEnvVariables,
  type PullVariablesSchema,
} from './pull-variables.js';

vi.mock('./client.js');

describe('getStorefrontEnvVariables', () => {
  const ADMIN_SESSION = {
    token: 'abc123',
    storeFqdn: 'my-shop.myshopify.com',
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('calls the graphql client and returns Hydrogen storefronts', async () => {
    const mockedResponse: PullVariablesSchema = {
      hydrogenStorefront: {
        id: '123',
        environmentVariables: [
          {
            id: '123',
            isSecret: false,
            readOnly: false,
            key: 'key',
            value: 'value',
          },
        ],
      },
    };

    vi.mocked(adminRequest<PullVariablesSchema>).mockResolvedValue(
      mockedResponse,
    );

    const id = '123';
    const envHandle = 'staging';

    await expect(
      getStorefrontEnvVariables(ADMIN_SESSION, id, envHandle),
    ).resolves.toStrictEqual(mockedResponse.hydrogenStorefront);

    expect(adminRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^#graphql.+query.+hydrogenStorefront\(/s),
      ADMIN_SESSION,
      {id, handle: envHandle},
    );
  });
});
