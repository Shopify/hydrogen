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

export function createCustomerAccountHelper(
  customerApiVersion: string,
  shopId: string,
  storefrontDomain?: string,
  useDiscovery = true,
  discovered?: DiscoveredEndpoints | null,
) {
  return function getCustomerAccountUrl(urlType: URL_TYPE): string {
    // If discovery is disabled or no storefront domain is provided, use legacy fallback URLs
    if (!useDiscovery || !storefrontDomain || !discovered) {
      return getLegacyUrl(urlType, shopId, customerApiVersion);
    }

    switch (urlType) {
      case URL_TYPE.CA_BASE_URL:
        return new URL(discovered.graphqlApiUrl).origin;

      case URL_TYPE.CA_BASE_AUTH_URL:
        return new URL(discovered.authorizationUrl).origin;

      case URL_TYPE.GRAPHQL:
        if (customerApiVersion)
          return discovered.graphqlApiUrl.replace(
            /\/api\/[^\/]+\//,
            `/api/${customerApiVersion}/`,
          );
        return discovered.graphqlApiUrl;

      case URL_TYPE.AUTH:
        return discovered.authorizationUrl;

      case URL_TYPE.LOGIN_SCOPE:
        return shopId
          ? 'openid email customer-account-api:full'
          : 'openid email https://api.customers.com/auth/customer.graphql';

      case URL_TYPE.TOKEN_EXCHANGE:
        return discovered.tokenUrl;

      case URL_TYPE.LOGOUT:
        return discovered.logoutUrl;

      default:
        throw new Error(`Unknown URL type: ${urlType}`);
    }
  };
}

function getLegacyUrl(
  urlType: URL_TYPE,
  shopId: string,
  customerApiVersion?: string,
): string {
  const customerAccountUrl = `https://shopify.com/${shopId}`;
  const customerAccountAuthUrl = `https://shopify.com/authentication/${shopId}`;

  switch (urlType) {
    case URL_TYPE.CA_BASE_URL:
      return customerAccountUrl;
    case URL_TYPE.CA_BASE_AUTH_URL:
      return customerAccountAuthUrl;
    case URL_TYPE.GRAPHQL:
      return `${customerAccountUrl}/account/customer/api/${customerApiVersion}/graphql`;
    case URL_TYPE.AUTH:
      return `${customerAccountAuthUrl}/oauth/authorize`;
    case URL_TYPE.LOGIN_SCOPE:
      return shopId
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
