import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
  discoverOpenIdConfiguration,
  discoverCustomerAccountApi,
  discoverCustomerAccountEndpoints,
  clearDiscoveryCache,
} from './discovery';
import {USER_AGENT} from './constants';

// Mock fetch
global.fetch = vi.fn();

describe('discovery utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDiscoveryCache();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('discoverOpenIdConfiguration', () => {
    it('successfully discovers OpenID configuration', async () => {
      const mockConfig = {
        issuer: 'https://test-shop.account.myshopify.com',
        authorization_endpoint:
          'https://test-shop.account.myshopify.com/oauth/authorize',
        token_endpoint: 'https://test-shop.account.myshopify.com/oauth/token',
        jwks_uri:
          'https://test-shop.account.myshopify.com/.well-known/jwks.json',
        end_session_endpoint: 'https://test-shop.account.myshopify.com/logout',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response);

      const result = await discoverOpenIdConfiguration(
        'test-shop.myshopify.com',
      );
      expect(result).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledWith(
        'https://test-shop.myshopify.com/.well-known/openid-configuration',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
          }),
          signal: expect.any(Object),
        }),
      );
    });

    it('returns null when endpoint is not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await discoverOpenIdConfiguration(
        'test-shop.myshopify.com',
      );
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('OpenID configuration discovery failed'),
      );
    });

    it('returns null when configuration is invalid', async () => {
      const invalidConfig = {
        issuer: 'https://test-shop.account.myshopify.com',
        // missing required endpoints
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidConfig),
      } as Response);

      const result = await discoverOpenIdConfiguration(
        'test-shop.myshopify.com',
      );
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid OpenID configuration'),
      );
    });

    it('handles network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await discoverOpenIdConfiguration(
        'test-shop.myshopify.com',
      );
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('OpenID configuration discovery failed'),
        expect.any(Error),
      );
    });

    it('caches successful results', async () => {
      const mockConfig = {
        issuer: 'https://test-shop.account.myshopify.com',
        authorization_endpoint:
          'https://test-shop.account.myshopify.com/oauth/authorize',
        token_endpoint: 'https://test-shop.account.myshopify.com/oauth/token',
        jwks_uri:
          'https://test-shop.account.myshopify.com/.well-known/jwks.json',
        end_session_endpoint: 'https://test-shop.account.myshopify.com/logout',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response);

      // First call
      const result1 = await discoverOpenIdConfiguration(
        'test-shop.myshopify.com',
      );
      expect(result1).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await discoverOpenIdConfiguration(
        'test-shop.myshopify.com',
      );
      expect(result2).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('discoverCustomerAccountApi', () => {
    it('successfully discovers Customer Account API configuration', async () => {
      const mockConfig = {
        graphql_api:
          'https://test-shop.account.myshopify.com/customer/api/graphql',
        mcp_api: 'https://test-shop.account.myshopify.com/customer/api/mcp',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response);

      const result = await discoverCustomerAccountApi(
        'test-shop.myshopify.com',
      );
      expect(result).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledWith(
        'https://test-shop.myshopify.com/.well-known/customer-account-api',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
          }),
          signal: expect.any(Object),
        }),
      );
    });

    it('returns null when endpoint is not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await discoverCustomerAccountApi(
        'test-shop.myshopify.com',
      );
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Customer Account API discovery failed'),
      );
    });

    it('returns null when configuration is invalid', async () => {
      const invalidConfig = {
        graphql_api:
          'https://test-shop.account.myshopify.com/customer/api/graphql',
        // missing mcp_api
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidConfig),
      } as Response);

      const result = await discoverCustomerAccountApi(
        'test-shop.myshopify.com',
      );
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid Customer Account API configuration'),
      );
    });
  });

  describe('discoverCustomerAccountEndpoints', () => {
    it('successfully discovers all endpoints', async () => {
      const mockOpenIdConfig = {
        issuer: 'https://test-shop.account.myshopify.com',
        authorization_endpoint:
          'https://test-shop.account.myshopify.com/oauth/authorize',
        token_endpoint: 'https://test-shop.account.myshopify.com/oauth/token',
        jwks_uri:
          'https://test-shop.account.myshopify.com/.well-known/jwks.json',
        end_session_endpoint: 'https://test-shop.account.myshopify.com/logout',
      };

      const mockApiConfig = {
        graphql_api:
          'https://test-shop.account.myshopify.com/customer/api/graphql',
        mcp_api: 'https://test-shop.account.myshopify.com/customer/api/mcp',
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOpenIdConfig),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiConfig),
        } as Response);

      const result = await discoverCustomerAccountEndpoints(
        'test-shop.myshopify.com',
      );
      expect(result).toEqual({
        graphqlApiUrl: mockApiConfig.graphql_api,
        authorizationUrl: mockOpenIdConfig.authorization_endpoint,
        tokenUrl: mockOpenIdConfig.token_endpoint,
        logoutUrl: mockOpenIdConfig.end_session_endpoint,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Successfully discovered Customer Account endpoints',
        ),
      );
    });

    it('handles partial discovery gracefully', async () => {
      const mockOpenIdConfig = {
        issuer: 'https://test-shop.account.myshopify.com',
        authorization_endpoint:
          'https://test-shop.account.myshopify.com/oauth/authorize',
        token_endpoint: 'https://test-shop.account.myshopify.com/oauth/token',
        jwks_uri:
          'https://test-shop.account.myshopify.com/.well-known/jwks.json',
        end_session_endpoint: 'https://test-shop.account.myshopify.com/logout',
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOpenIdConfig),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response);

      const result = await discoverCustomerAccountEndpoints(
        'test-shop.myshopify.com',
      );
      // With all-or-nothing approach, partial discovery returns null
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Incomplete discovery'),
      );
    });

    it('returns null when no domain is provided', async () => {
      const result = await discoverCustomerAccountEndpoints('');
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No storefront domain provided'),
      );
    });

    it('returns null when all discovery fails', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response);

      const result = await discoverCustomerAccountEndpoints(
        'test-shop.myshopify.com',
      );
      // With all-or-nothing approach, complete failure returns null
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Incomplete discovery'),
      );
    });
  });

  describe('clearDiscoveryCache', () => {
    it('clears cache for specific domain', async () => {
      const mockConfig = {
        issuer: 'https://test-shop.account.myshopify.com',
        authorization_endpoint:
          'https://test-shop.account.myshopify.com/oauth/authorize',
        token_endpoint: 'https://test-shop.account.myshopify.com/oauth/token',
        jwks_uri:
          'https://test-shop.account.myshopify.com/.well-known/jwks.json',
        end_session_endpoint: 'https://test-shop.account.myshopify.com/logout',
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response);

      // Cache a result
      await discoverOpenIdConfiguration('test-shop.myshopify.com');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Clear cache for this domain
      clearDiscoveryCache('test-shop.myshopify.com');

      // Should fetch again
      await discoverOpenIdConfiguration('test-shop.myshopify.com');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('clears all cache when no domain specified', async () => {
      const mockConfig = {
        issuer: 'https://test-shop.account.myshopify.com',
        authorization_endpoint:
          'https://test-shop.account.myshopify.com/oauth/authorize',
        token_endpoint: 'https://test-shop.account.myshopify.com/oauth/token',
        jwks_uri:
          'https://test-shop.account.myshopify.com/.well-known/jwks.json',
        end_session_endpoint: 'https://test-shop.account.myshopify.com/logout',
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response);

      // Cache results for multiple domains
      await discoverOpenIdConfiguration('test-shop1.myshopify.com');
      await discoverOpenIdConfiguration('test-shop2.myshopify.com');
      expect(fetch).toHaveBeenCalledTimes(2);

      // Clear all cache
      clearDiscoveryCache();

      // Should fetch again for both
      await discoverOpenIdConfiguration('test-shop1.myshopify.com');
      await discoverOpenIdConfiguration('test-shop2.myshopify.com');
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });
});
