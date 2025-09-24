import {
  discoverCustomerAccountEndpoints,
  type DiscoveredEndpoints,
} from './discovery';

export enum URL_TYPE {
  CA_BASE_URL = 'CA_BASE_URL',
  CA_BASE_AUTH_URL = 'CA_BASE_AUTH_URL',
  GRAPHQL = 'GRAPHQL',
  AUTH = 'AUTH',
  LOGIN_SCOPE = 'LOGIN_SCOPE',
  TOKEN_EXCHANGE = 'TOKEN_EXCHANGE',
  LOGOUT = 'LOGOUT',
}

interface CustomerAccountHelperConfig {
  customerApiVersion: string;
  shopId: string;
  storefrontDomain?: string;
  useDiscovery?: boolean;
  discoveredEndpoints?: DiscoveredEndpoints | null;
}

export function createCustomerAccountHelper(
  customerApiVersion: string,
  shopId: string,
  storefrontDomain?: string,
  useDiscovery = true,
  discoveredEndpoints?: DiscoveredEndpoints | null,
) {
  const config: CustomerAccountHelperConfig = {
    customerApiVersion,
    shopId,
    storefrontDomain,
    useDiscovery,
    discoveredEndpoints,
  };

  const fallbackCustomerAccountUrl = `https://shopify.com/${shopId}`;
  const fallbackCustomerAccountAuthUrl = `https://shopify.com/authentication/${shopId}`;

  return function getCustomerAccountUrl(urlType: URL_TYPE): string {
    // If discovery is disabled or no storefront domain is provided, use legacy fallback URLs
    if (
      !config.useDiscovery ||
      !config.storefrontDomain ||
      !config.discoveredEndpoints
    ) {
      return getLegacyUrl(urlType, config);
    }

    const discovered = config.discoveredEndpoints;

    switch (urlType) {
      case URL_TYPE.CA_BASE_URL:
        // Extract base URL from GraphQL endpoint if available
        if (discovered.graphqlApiUrl) {
          const graphqlUrl = new URL(discovered.graphqlApiUrl);
          return `${graphqlUrl.protocol}//${graphqlUrl.host}`;
        }
        return fallbackCustomerAccountUrl;

      case URL_TYPE.CA_BASE_AUTH_URL:
        // Extract base URL from auth endpoint if available
        if (discovered.authorizationUrl) {
          const authUrl = new URL(discovered.authorizationUrl);
          // Remove the path to get base URL
          return `${authUrl.protocol}//${authUrl.host}`;
        }
        return fallbackCustomerAccountAuthUrl;

      case URL_TYPE.GRAPHQL:
        if (discovered.graphqlApiUrl) {
          return discovered.graphqlApiUrl;
        }
        return `${fallbackCustomerAccountUrl}/account/customer/api/${config.customerApiVersion}/graphql`;

      case URL_TYPE.AUTH:
        if (discovered.authorizationUrl) {
          return discovered.authorizationUrl;
        }
        return `${fallbackCustomerAccountAuthUrl}/oauth/authorize`;

      case URL_TYPE.LOGIN_SCOPE:
        return config.shopId
          ? 'openid email customer-account-api:full'
          : 'openid email https://api.customers.com/auth/customer.graphql';

      case URL_TYPE.TOKEN_EXCHANGE:
        if (discovered.tokenUrl) {
          return discovered.tokenUrl;
        }
        return `${fallbackCustomerAccountAuthUrl}/oauth/token`;

      case URL_TYPE.LOGOUT:
        if (discovered.logoutUrl) {
          return discovered.logoutUrl;
        }
        return `${fallbackCustomerAccountAuthUrl}/logout`;

      default:
        throw new Error(`Unknown URL type: ${urlType}`);
    }
  };
}

function getLegacyUrl(
  urlType: URL_TYPE,
  config: CustomerAccountHelperConfig,
): string {
  const customerAccountUrl = `https://shopify.com/${config.shopId}`;
  const customerAccountAuthUrl = `https://shopify.com/authentication/${config.shopId}`;

  switch (urlType) {
    case URL_TYPE.CA_BASE_URL:
      return customerAccountUrl;
    case URL_TYPE.CA_BASE_AUTH_URL:
      return customerAccountAuthUrl;
    case URL_TYPE.GRAPHQL:
      return `${customerAccountUrl}/account/customer/api/${config.customerApiVersion}/graphql`;
    case URL_TYPE.AUTH:
      return `${customerAccountAuthUrl}/oauth/authorize`;
    case URL_TYPE.LOGIN_SCOPE:
      return config.shopId
        ? 'openid email customer-account-api:full'
        : 'openid email https://api.customers.com/auth/customer.graphql';
    case URL_TYPE.TOKEN_EXCHANGE:
      return `${customerAccountAuthUrl}/oauth/token`;
    case URL_TYPE.LOGOUT:
      return `${customerAccountAuthUrl}/logout`;
    default:
      throw new Error(`Unknown URL type: ${urlType}`);
  }
}

export async function createCustomerAccountHelperWithDiscovery(
  customerApiVersion: string,
  shopId: string,
  storefrontDomain: string,
  useDiscovery = true,
): Promise<(urlType: URL_TYPE) => string> {
  let discoveredEndpoints: DiscoveredEndpoints | null = null;

  if (useDiscovery && storefrontDomain) {
    try {
      discoveredEndpoints =
        await discoverCustomerAccountEndpoints(storefrontDomain);

      if (
        discoveredEndpoints &&
        Object.values(discoveredEndpoints).some(Boolean)
      ) {
        console.log(
          `[h2:info:discovery] Successfully discovered Customer Account endpoints for ${storefrontDomain}`,
        );
      } else {
        console.warn(
          `[h2:warn:discovery] No Customer Account endpoints discovered for ${storefrontDomain}, falling back to legacy URLs`,
        );
        discoveredEndpoints = null; // Ensure fallback behavior
      }
    } catch (error) {
      console.warn(
        `[h2:warn:discovery] Discovery failed for ${storefrontDomain}, falling back to legacy URLs:`,
        error,
      );
      discoveredEndpoints = null; // Ensure fallback behavior
    }
  } else if (useDiscovery && !storefrontDomain) {
    console.warn(
      '[h2:warn:discovery] Discovery is enabled but no storefront domain provided, using legacy URLs',
    );
  }

  return createCustomerAccountHelper(
    customerApiVersion,
    shopId,
    storefrontDomain,
    useDiscovery && Boolean(discoveredEndpoints),
    discoveredEndpoints,
  );
}
