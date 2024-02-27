import {AbortError} from '@shopify/cli-kit/node/error';
import {describe, it, expect, vi, afterEach} from 'vitest';

import {adminRequest} from './client.js';

import {
  graphqlRequest,
  type GraphQLVariables,
} from '@shopify/cli-kit/node/api/graphql';

vi.mock('@shopify/cli-kit/node/api/graphql');

interface TestSchema {
  test: string;
}

describe('adminRequest', () => {
  it('sends a query to the Admin API and returns the successful response', async () => {
    const fakeResponse = {
      test: 'test',
    };

    vi.mocked(graphqlRequest).mockResolvedValue(fakeResponse);

    const response = await adminRequest<TestSchema>('', {
      token: '',
      storeFqdn: '',
    });

    expect(response).toContain(fakeResponse);
  });

  describe('error response', () => {
    it('sends a query to the Admin API and returns an unknown error response', async () => {
      const fakeGraphqlError = {
        errors: [
          {
            message: 'test error',
          },
        ],
      };

      vi.mocked(graphqlRequest).mockRejectedValue(fakeGraphqlError);

      const response = adminRequest<TestSchema>('', {
        token: '',
        storeFqdn: '',
      });

      await expect(response).rejects.toContain(fakeGraphqlError);
    });

    it("sends a query to the Admin API and returns an error where app isn't installed", async () => {
      const fakeGraphqlError = {
        errors: [
          {
            message: 'app is not installed',
          },
        ],
      };

      vi.mocked(graphqlRequest).mockRejectedValue(fakeGraphqlError);

      const response = adminRequest<TestSchema>('', {
        token: '',
        storeFqdn: '',
      });

      await expect(response).rejects.toThrowError(AbortError);
    });
  });
});
