export enum URL_TYPE {
  CA_BASE_URL = 'CA_BASE_URL',
  CA_BASE_AUTH_URL = 'CA_BASE_AUTH_URL',
  GRAPHQL = 'GRAPHQL',
  AUTH = 'AUTH',
  LOGIN_SCOPE = 'LOGIN_SCOPE',
  TOKEN_EXCHANGE = 'TOKEN_EXCHANGE',
  LOGOUT = 'LOGOUT',
}

export function createGetCustomerAccountUrl(
  customerApiVersion: string,
  deprecatedCustomerAccountUrl?: string,
  shopId?: string,
) {
  const customerAccountUrl = shopId
    ? `https://shopify.com/${shopId}`
    : deprecatedCustomerAccountUrl;

  const customerAccountAuthUrl = shopId
    ? `https://shopify.com/${shopId}/auth_test`
    : `${deprecatedCustomerAccountUrl}/auth_test`;

  return function getCustomerAccountUrl(urlType: URL_TYPE): string {
    switch (urlType) {
      case URL_TYPE.CA_BASE_URL:
        // @ts-expect-error
        return customerAccountUrl;
      case URL_TYPE.CA_BASE_AUTH_URL:
        return customerAccountAuthUrl;
      case URL_TYPE.GRAPHQL:
        return `${customerAccountUrl}/account/customer/api/${customerApiVersion}/graphql`;
      case URL_TYPE.AUTH:
        return `${customerAccountAuthUrl}/oauth/authorize`;
      case URL_TYPE.LOGIN_SCOPE:
        return 'openid email https://api.customers.com/auth/customer.graphql';
      case URL_TYPE.TOKEN_EXCHANGE:
        return `${customerAccountAuthUrl}/oauth/token`;
      case URL_TYPE.LOGOUT:
        return `${customerAccountAuthUrl}/logout`;
    }
  };
}
