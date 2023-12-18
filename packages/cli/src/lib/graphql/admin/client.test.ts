import {AbortError} from '@shopify/cli-kit/node/error';
import {describe, it, expect, vi} from 'vitest';

import {adminRequest} from './client.js';

import {graphqlRequest} from '@shopify/cli-kit/node/api/graphql';

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

    expect(response).toMatchObject(fakeResponse);
  });

  describe('when there is an unknown error response', () => {
    it('passes along the error message', async () => {
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

      await expect(response).rejects.toMatchObject(fakeGraphqlError);
    });
  });

  describe("when the app isn't installed", () => {
    it('throws an AbortError', async () => {
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
      await expect(response).rejects.toMatch(
        /Hydrogen sales channel isn\'t installed/,
      );
    });
  });

  describe("when the user doesn't have access to hydrogenStorefrontCreate", () => {
    it('throws an AbortError', async () => {
      const fakeGraphqlError = {
        errors: [
          {
            message: 'Access denied for hydrogenStorefrontCreate field',
          },
        ],
      };

      vi.mocked(graphqlRequest).mockRejectedValue(fakeGraphqlError);

      const response = adminRequest<TestSchema>('', {
        token: '',
        storeFqdn: '',
      });

      await expect(response).rejects.toThrowError(AbortError);
      await expect(response).rejects.toMatch(
        /Couldn\'t connect storefront to Shopify/,
      );
    });
  });
});
