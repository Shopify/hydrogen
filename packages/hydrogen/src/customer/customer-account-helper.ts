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
  storefrontDomain: string,
  discovered: DiscoveredEndpoints,
) {
  return function getCustomerAccountUrl(urlType: URL_TYPE): string {
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

export async function createCustomerAccountHelperWithDiscovery(
  customerApiVersion: string,
  shopId: string,
  storefrontDomain: string,
): Promise<(urlType: URL_TYPE) => string> {
  const discoveredEndpoints =
    await discoverCustomerAccountEndpoints(storefrontDomain);

  if (!discoveredEndpoints) {
    throw new Error(
      `[h2:error:discovery] Failed to discover Customer Account endpoints for ${storefrontDomain}. ` +
        `Endpoint discovery is required for Customer Account API. ` +
        `Ensure your storefront domain is correctly configured and the discovery endpoints are accessible.`,
    );
  }

  return createCustomerAccountHelper(
    customerApiVersion,
    shopId,
    storefrontDomain,
    discoveredEndpoints,
  );
}
