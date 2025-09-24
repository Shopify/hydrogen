import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  createCustomerAccountHelper,
  createCustomerAccountHelperWithDiscovery,
  URL_TYPE,
} from './customer-account-helper';

// Mock the discovery module
vi.mock('./discovery', () => ({
  discoverCustomerAccountEndpoints: vi.fn(),
}));

const shopId = '1';
const customerAccountUrl = `https://shopify.com/${shopId}`;

describe('return correct urls', () => {
  describe('when shopId is provided', () => {
    const getAccountUrl = createCustomerAccountHelper('2025-07', shopId);

    it('returns customer account base url', () => {
      expect(getAccountUrl(URL_TYPE.CA_BASE_URL)).toBe(customerAccountUrl);
    });

    it('returns customer account auth url', () => {
      expect(getAccountUrl(URL_TYPE.CA_BASE_AUTH_URL)).toBe(
        `https://shopify.com/authentication/${shopId}`,
      );
    });

    it('returns customer account graphql url', () => {
      expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
        `${customerAccountUrl}/account/customer/api/2025-07/graphql`,
      );
    });

    it('returns customer account authorize url', () => {
      expect(getAccountUrl(URL_TYPE.AUTH)).toBe(
        `https://shopify.com/authentication/${shopId}/oauth/authorize`,
      );
    });

    it('returns customer account login scope', () => {
      expect(getAccountUrl(URL_TYPE.LOGIN_SCOPE)).toBe(
        'openid email customer-account-api:full',
      );
    });

    it('returns customer account token exchange url', () => {
      expect(getAccountUrl(URL_TYPE.TOKEN_EXCHANGE)).toBe(
        `https://shopify.com/authentication/${shopId}/oauth/token`,
      );
    });

    it('returns customer account logout url', () => {
      expect(getAccountUrl(URL_TYPE.LOGOUT)).toBe(
        `https://shopify.com/authentication/${shopId}/logout`,
      );
    });
  });
});

describe('legacy behavior without discovery', () => {
  it('maintains backward compatibility with existing API', () => {
    const getAccountUrl = createCustomerAccountHelper('2025-07', shopId);
    expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
      `${customerAccountUrl}/account/customer/api/2025-07/graphql`,
    );
  });

  it('works with discovery disabled', () => {
    const storefrontDomain = 'test-shop.myshopify.com';
    const getAccountUrl = createCustomerAccountHelper(
      '2025-07',
      shopId,
      storefrontDomain,
      false, // discovery disabled
    );
    expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
      `${customerAccountUrl}/account/customer/api/2025-07/graphql`,
    );
  });
});

describe('discovery functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses discovered GraphQL endpoint when available', () => {
    const storefrontDomain = 'test-shop.myshopify.com';
    const discoveredEndpoints = {
      graphqlApiUrl:
        'https://test-shop.account.myshopify.com/customer/api/2025-07/graphql',
      authorizationUrl:
        'https://test-shop.account.myshopify.com/oauth/authorize',
      tokenUrl: 'https://test-shop.account.myshopify.com/oauth/token',
      logoutUrl: 'https://test-shop.account.myshopify.com/logout',
    };

    const getAccountUrl = createCustomerAccountHelper(
      '2025-07',
      shopId,
      storefrontDomain,
      true,
      discoveredEndpoints,
    );

    expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
      discoveredEndpoints.graphqlApiUrl,
    );
    expect(getAccountUrl(URL_TYPE.AUTH)).toBe(
      discoveredEndpoints.authorizationUrl,
    );
    expect(getAccountUrl(URL_TYPE.TOKEN_EXCHANGE)).toBe(
      discoveredEndpoints.tokenUrl,
    );
    expect(getAccountUrl(URL_TYPE.LOGOUT)).toBe(discoveredEndpoints.logoutUrl);
  });

  it('falls back to legacy URLs when discovery fails', () => {
    const storefrontDomain = 'test-shop.myshopify.com';

    const getAccountUrl = createCustomerAccountHelper(
      '2025-07',
      shopId,
      storefrontDomain,
      true,
      null, // No discovered endpoints
    );

    expect(getAccountUrl(URL_TYPE.GRAPHQL)).toBe(
      `${customerAccountUrl}/account/customer/api/2025-07/graphql`,
    );
    expect(getAccountUrl(URL_TYPE.AUTH)).toBe(
      `https://shopify.com/authentication/${shopId}/oauth/authorize`,
    );
  });

  it('extracts base URLs from discovered endpoints', () => {
    const storefrontDomain = 'test-shop.myshopify.com';
    const discoveredEndpoints = {
      graphqlApiUrl:
        'https://test-shop.account.myshopify.com/customer/api/2025-07/graphql',
      authorizationUrl:
        'https://test-shop.account.myshopify.com/authentication/oauth/authorize',
      tokenUrl: 'https://test-shop.account.myshopify.com/oauth/token',
      logoutUrl: 'https://test-shop.account.myshopify.com/logout',
    };

    const getAccountUrl = createCustomerAccountHelper(
      '2025-07',
      shopId,
      storefrontDomain,
      true,
      discoveredEndpoints,
    );

    expect(getAccountUrl(URL_TYPE.CA_BASE_URL)).toBe(
      'https://test-shop.account.myshopify.com',
    );
    expect(getAccountUrl(URL_TYPE.CA_BASE_AUTH_URL)).toBe(
      'https://test-shop.account.myshopify.com',
    );
  });
});

describe('createCustomerAccountHelperWithDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('successfully creates helper with discovery', async () => {
    const {discoverCustomerAccountEndpoints} = await import('./discovery');
    const mockEndpoints = {
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
      'test-shop.myshopify.com',
    );

    expect(helper(URL_TYPE.GRAPHQL)).toBe(mockEndpoints.graphqlApiUrl);
    expect(discoverCustomerAccountEndpoints).toHaveBeenCalledWith(
      'test-shop.myshopify.com',
    );
  });

  it('falls back to legacy URLs when discovery fails', async () => {
    const {discoverCustomerAccountEndpoints} = await import('./discovery');

    vi.mocked(discoverCustomerAccountEndpoints).mockRejectedValue(
      new Error('Discovery failed'),
    );

    const helper = await createCustomerAccountHelperWithDiscovery(
      '2025-07',
      shopId,
      'test-shop.myshopify.com',
    );

    expect(helper(URL_TYPE.GRAPHQL)).toBe(
      `${customerAccountUrl}/account/customer/api/2025-07/graphql`,
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Discovery failed'),
      expect.any(Error),
    );
  });
});
