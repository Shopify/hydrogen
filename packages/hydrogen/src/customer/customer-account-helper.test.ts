import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  createCustomerAccountHelper,
  createCustomerAccountHelperWithDiscovery,
  URL_TYPE,
} from './customer-account-helper';
import type {DiscoveredEndpoints} from './discovery';

// Mock the discovery module
vi.mock('./discovery', () => ({
  discoverCustomerAccountEndpoints: vi.fn(),
}));

const shopId = '1';
const storefrontDomain = 'test-shop.myshopify.com';

describe('createCustomerAccountHelper', () => {
  const discoveredEndpoints: DiscoveredEndpoints = {
    graphqlApiUrl:
      'https://test-shop.account.myshopify.com/customer/api/2025-07/graphql',
    authorizationUrl: 'https://test-shop.account.myshopify.com/oauth/authorize',
    tokenUrl: 'https://test-shop.account.myshopify.com/oauth/token',
    logoutUrl: 'https://test-shop.account.myshopify.com/logout',
  };

  const getAccountUrl = createCustomerAccountHelper(
    '2025-07',
    shopId,
    storefrontDomain,
    discoveredEndpoints,
  );

  it('returns discovered GraphQL endpoint', () => {
    expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
      discoveredEndpoints.graphqlApiUrl,
    );
  });

  it('returns discovered authorization endpoint', () => {
    expect(getAccountUrl(URL_TYPE.AUTH)).toBe(
      discoveredEndpoints.authorizationUrl,
    );
  });

  it('returns discovered token exchange endpoint', () => {
    expect(getAccountUrl(URL_TYPE.TOKEN_EXCHANGE)).toBe(
      discoveredEndpoints.tokenUrl,
    );
  });

  it('returns discovered logout endpoint', () => {
    expect(getAccountUrl(URL_TYPE.LOGOUT)).toBe(discoveredEndpoints.logoutUrl);
  });

  it('extracts base URL from discovered GraphQL endpoint', () => {
    expect(getAccountUrl(URL_TYPE.CA_BASE_URL)).toBe(
      'https://test-shop.account.myshopify.com',
    );
  });

  it('extracts base auth URL from discovered authorization endpoint', () => {
    expect(getAccountUrl(URL_TYPE.CA_BASE_AUTH_URL)).toBe(
      'https://test-shop.account.myshopify.com',
    );
  });

  it('replaces API version in discovered GraphQL URL', () => {
    const endpointsWithOldVersion: DiscoveredEndpoints = {
      graphqlApiUrl:
        'https://test-shop.account.myshopify.com/customer/api/2024-01/graphql',
      authorizationUrl:
        'https://test-shop.account.myshopify.com/oauth/authorize',
      tokenUrl: 'https://test-shop.account.myshopify.com/oauth/token',
      logoutUrl: 'https://test-shop.account.myshopify.com/logout',
    };

    const expectedVersion = '2025-07';
    const getAccountUrl = createCustomerAccountHelper(
      expectedVersion,
      shopId,
      storefrontDomain,
      endpointsWithOldVersion,
    );

    expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
      `https://test-shop.account.myshopify.com/customer/api/${expectedVersion}/graphql`,
    );
  });

  it('returns correct login scope for shopId', () => {
    expect(getAccountUrl(URL_TYPE.LOGIN_SCOPE)).toBe(
      'openid email customer-account-api:full',
    );
  });

  it('returns correct login scope without shopId', () => {
    const getAccountUrl = createCustomerAccountHelper(
      '2025-07',
      '', // empty shopId
      storefrontDomain,
      discoveredEndpoints,
    );

    expect(getAccountUrl(URL_TYPE.LOGIN_SCOPE)).toBe(
      'openid email https://api.customers.com/auth/customer.graphql',
    );
  });

  it('throws error for unknown URL type', () => {
    expect(() => getAccountUrl('UNKNOWN' as URL_TYPE)).toThrow(
      'Unknown URL type: UNKNOWN',
    );
  });
});

describe('createCustomerAccountHelperWithDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates helper with discovery', async () => {
    const {discoverCustomerAccountEndpoints} = await import('./discovery');
    const mockEndpoints: DiscoveredEndpoints = {
      graphqlApiUrl:
        'https://test-shop.account.myshopify.com/customer/api/2025-07/graphql',
      authorizationUrl:
        'https://test-shop.account.myshopify.com/oauth/authorize',
      tokenUrl: 'https://test-shop.account.myshopify.com/oauth/token',
      logoutUrl: 'https://test-shop.account.myshopify.com/logout',
    };

    vi.mocked(discoverCustomerAccountEndpoints).mockResolvedValue(
      mockEndpoints,
    );

    const helper = await createCustomerAccountHelperWithDiscovery(
      '2025-07',
      shopId,
      storefrontDomain,
    );

    expect(helper(URL_TYPE.GRAPHQL)).toBe(mockEndpoints.graphqlApiUrl);
    expect(discoverCustomerAccountEndpoints).toHaveBeenCalledWith(
      storefrontDomain,
    );
  });

  it('throws error when discovery fails', async () => {
    const {discoverCustomerAccountEndpoints} = await import('./discovery');

    vi.mocked(discoverCustomerAccountEndpoints).mockRejectedValue(
      new Error('Network error'),
    );

    await expect(
      createCustomerAccountHelperWithDiscovery(
        '2025-07',
        shopId,
        storefrontDomain,
      ),
    ).rejects.toThrow('Network error');
  });

  it('uses discovered endpoints for all URL types', async () => {
    const {discoverCustomerAccountEndpoints} = await import('./discovery');
    const mockEndpoints: DiscoveredEndpoints = {
      graphqlApiUrl:
        'https://test-shop.account.myshopify.com/customer/api/2025-07/graphql',
      authorizationUrl:
        'https://test-shop.account.myshopify.com/oauth/authorize',
      tokenUrl: 'https://test-shop.account.myshopify.com/oauth/token',
      logoutUrl: 'https://test-shop.account.myshopify.com/logout',
    };

    vi.mocked(discoverCustomerAccountEndpoints).mockResolvedValue(
      mockEndpoints,
    );

    const helper = await createCustomerAccountHelperWithDiscovery(
      '2025-07',
      shopId,
      storefrontDomain,
    );

    expect(helper(URL_TYPE.GRAPHQL)).toBe(mockEndpoints.graphqlApiUrl);
    expect(helper(URL_TYPE.AUTH)).toBe(mockEndpoints.authorizationUrl);
    expect(helper(URL_TYPE.TOKEN_EXCHANGE)).toBe(mockEndpoints.tokenUrl);
    expect(helper(URL_TYPE.LOGOUT)).toBe(mockEndpoints.logoutUrl);
  });
});
