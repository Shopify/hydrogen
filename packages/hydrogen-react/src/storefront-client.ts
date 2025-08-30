import {SFAPI_VERSION} from './storefront-api-constants.js';

export type StorefrontClientProps = {
  /** The host name of the domain (eg: `{shop}.myshopify.com`). */
  storeDomain?: string;
  /** The Storefront API delegate access token. Refer to the [authentication](https://shopify.dev/api/storefront#authentication) and [delegate access token](https://shopify.dev/apps/auth/oauth/delegate-access-tokens) documentation for more details. */
  privateStorefrontToken?: string;
  /** The Storefront API access token. Refer to the [authentication](https://shopify.dev/api/storefront#authentication) documentation for more details. */
  publicStorefrontToken?: string;
  /** The Storefront API version. This should almost always be the same as the version Hydrogen React was built for. Learn more about Shopify [API versioning](https://shopify.dev/api/usage/versioning) for more details.  */
  storefrontApiVersion?: string;
  /**
   * Customizes which `"content-type"` header is added when using `getPrivateTokenHeaders()` and `getPublicTokenHeaders()`. When fetching with a `JSON.stringify()`-ed `body`, use `"json"`. When fetching with a `body` that is a plain string, use `"graphql"`. Defaults to `"json"`
   *
   * Can also be customized on a call-by-call basis by passing in `'contentType'` to both `getPrivateTokenHeaders({...})` and `getPublicTokenHeaders({...})`, for example: `getPublicTokenHeaders({contentType: 'graphql'})`
   */
  contentType?: 'json' | 'graphql';
};

const MOCK_SHOP_DOMAIN = 'mock.shop';
const isMockShop = (domain: string): boolean =>
  domain.includes(MOCK_SHOP_DOMAIN);

/**
 * The `createStorefrontClient()` function creates helpers that enable you to quickly query the Shopify Storefront API.
 *
 * When used on the server, it is recommended to use the `privateStorefrontToken` prop. When used on the client, it is recommended to use the `publicStorefrontToken` prop.
 */
export function createStorefrontClient({
  storeDomain,
  privateStorefrontToken,
  publicStorefrontToken,
  storefrontApiVersion = SFAPI_VERSION,
  contentType,
}: StorefrontClientProps): StorefrontClientReturn {
  if (!storeDomain) {
    if (__HYDROGEN_DEV__) {
      storeDomain = MOCK_SHOP_DOMAIN;
      warnOnce(
        `storeDomain missing, defaulting to ${MOCK_SHOP_DOMAIN}`,
        'info',
      );
    } else {
      throw new Error(
        H2_PREFIX_ERROR +
          `\`storeDomain\` is required when creating a new Storefront client in production.`,
      );
    }
  }

  if (storefrontApiVersion !== SFAPI_VERSION) {
    warnOnce(
      `The Storefront API version that you're using is different than the version this build of Hydrogen React is targeting.` +
        `\nYou may run into unexpected errors if these versions don't match. Received version: "${storefrontApiVersion}"; expected version "${SFAPI_VERSION}"`,
    );
  }

  // only warn if not in a browser environment
  if (
    __HYDROGEN_DEV__ &&
    !privateStorefrontToken &&
    !globalThis.document &&
    !isMockShop(storeDomain)
  ) {
    warnOnce(
      `Using a private storefront token is recommended for server environments.` +
        `\nRefer to the authentication https://shopify.dev/api/storefront#authentication documentation for more details.`,
    );
  }

  // only warn if in a browser environment and you're using the privateStorefrontToken
  if (__HYDROGEN_DEV__ && privateStorefrontToken && globalThis.document) {
    warnOnce(
      'You are attempting to use a private token in an environment where it can be easily accessed by anyone.' +
        '\nThis is a security risk; please use the public token and the `publicStorefrontToken` prop',
    );
  }

  const getShopifyDomain: StorefrontClientReturn['getShopifyDomain'] = (
    overrideProps,
  ) => {
    const domain = overrideProps?.storeDomain ?? storeDomain;
    return domain.includes('://') ? domain : `https://${domain}`;
  };

  return {
    getShopifyDomain,
    getStorefrontApiUrl(overrideProps): string {
      const domain = getShopifyDomain(overrideProps);
      const apiUrl = domain + (domain.endsWith('/') ? 'api' : '/api');

      if (isMockShop(domain)) return apiUrl;

      return `${apiUrl}/${
        overrideProps?.storefrontApiVersion ?? storefrontApiVersion
      }/graphql.json`;
    },
    getPrivateTokenHeaders(overrideProps): Record<string, string> {
      if (
        !privateStorefrontToken &&
        !overrideProps?.privateStorefrontToken &&
        !isMockShop(storeDomain)
      ) {
        throw new Error(
          H2_PREFIX_ERROR +
            'You did not pass in a `privateStorefrontToken` while using `createStorefrontClient()` or `getPrivateTokenHeaders()`',
        );
      }

      if (__HYDROGEN_DEV__ && !overrideProps?.buyerIp) {
        warnOnce(
          'It is recommended to pass in the `buyerIp` property which improves analytics and data in the admin.',
        );
      }

      const finalContentType = overrideProps?.contentType ?? contentType;

      return {
        // default to json
        'content-type':
          finalContentType === 'graphql'
            ? 'application/graphql'
            : 'application/json',
        'X-SDK-Variant': 'hydrogen-react',
        'X-SDK-Variant-Source': 'react',
        'X-SDK-Version': storefrontApiVersion,
        'Shopify-Storefront-Private-Token':
          overrideProps?.privateStorefrontToken ?? privateStorefrontToken ?? '',
        ...(overrideProps?.buyerIp
          ? {'Shopify-Storefront-Buyer-IP': overrideProps.buyerIp}
          : {}),
      };
    },
    getPublicTokenHeaders(overrideProps): Record<string, string> {
      if (
        !publicStorefrontToken &&
        !overrideProps?.publicStorefrontToken &&
        !isMockShop(storeDomain)
      ) {
        throw new Error(
          H2_PREFIX_ERROR +
            'You did not pass in a `publicStorefrontToken` while using `createStorefrontClient()` or `getPublicTokenHeaders()`',
        );
      }

      const finalContentType =
        overrideProps?.contentType ?? contentType ?? 'json';

      return getPublicTokenHeadersRaw(
        finalContentType,
        storefrontApiVersion,
        overrideProps?.publicStorefrontToken ?? publicStorefrontToken ?? '',
      );
    },
  };
}

export function getPublicTokenHeadersRaw(
  contentType: 'graphql' | 'json',
  storefrontApiVersion: string,
  accessToken: string,
): {
  'content-type': string;
  'X-SDK-Variant': string;
  'X-SDK-Variant-Source': string;
  'X-SDK-Version': string;
  'X-Shopify-Storefront-Access-Token': string;
  [key: string]: string; // Allow additional string properties
} {
  return {
    // default to json
    'content-type':
      contentType === 'graphql' ? 'application/graphql' : 'application/json',
    'X-SDK-Variant': 'hydrogen-react',
    'X-SDK-Variant-Source': 'react',
    'X-SDK-Version': storefrontApiVersion,
    'X-Shopify-Storefront-Access-Token': accessToken,
  };
}

const warnings = new Set<string>();
const H2_PREFIX_ERROR = '[h2:error:createStorefrontClient] ';
const warnOnce = (string: string, type: 'warn' | 'info' = 'warn'): void => {
  if (!warnings.has(string)) {
    console[type](`[h2:${type}:createStorefrontClient] ` + string);
    warnings.add(string);
  }
};

type OverrideTokenHeaderProps = Partial<
  Pick<StorefrontClientProps, 'contentType'>
>;

type StorefrontClientReturn = {
  /**
   * Creates the fully-qualified URL to your myshopify.com domain.
   *
   * By default, it will use the config you passed in when calling `createStorefrontClient()`. However, you can override the following settings on each invocation of `getShopifyDomain({...})`:
   *
   * - `storeDomain`
   */
  getShopifyDomain: (
    props?: Partial<Pick<StorefrontClientProps, 'storeDomain'>>,
  ) => string;
  /**
   * Creates the fully-qualified URL to your store's GraphQL endpoint.
   *
   * By default, it will use the config you passed in when calling `createStorefrontClient()`. However, you can override the following settings on each invocation of `getStorefrontApiUrl({...})`:
   *
   * - `storeDomain`
   * - `storefrontApiVersion`
   */
  getStorefrontApiUrl: (
    props?: Partial<
      Pick<StorefrontClientProps, 'storeDomain' | 'storefrontApiVersion'>
    >,
  ) => string;
  /**
   * Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. This method uses the private Server-to-Server token which reduces the chance of throttling but must not be exposed to clients. Server-side calls should prefer using this over `getPublicTokenHeaders()`.
   *
   * By default, it will use the config you passed in when calling `createStorefrontClient()`. However, you can override the following settings on each invocation of `getPrivateTokenHeaders({...})`:
   *
   * - `contentType`
   * - `privateStorefrontToken`
   * - `buyerIp`
   *
   * Note that `contentType` defaults to what you configured in `createStorefrontClient({...})` and defaults to `'json'`, but a specific call may require using `graphql`. When using `JSON.stringify()` on the `body`, use `'json'`; otherwise, use `'graphql'`.
   */
  getPrivateTokenHeaders: (
    props?: OverrideTokenHeaderProps &
      Pick<StorefrontClientProps, 'privateStorefrontToken'> & {
        /**
         * The client's IP address. Passing this to the Storefront API when using a server-to-server token will help improve your store's analytics data.
         */
        buyerIp?: string;
      },
  ) => Record<string, string>;
  /**
   * Returns an object that contains headers that are needed for each query to Storefront API GraphQL endpoint. This method uses the public token which increases the chance of throttling but also can be exposed to clients. Server-side calls should prefer using `getPublicTokenHeaders()`.
   *
   * By default, it will use the config you passed in when calling `createStorefrontClient()`. However, you can override the following settings on each invocation of `getPublicTokenHeaders({...})`:
   *
   * - `contentType`
   * - `publicStorefrontToken`
   *
   * Note that `contentType` defaults to what you configured in `createStorefrontClient({...})` and defaults to `'json'`, but a specific call may require using `graphql`. When using `JSON.stringify()` on the `body`, use `'json'`; otherwise, use `'graphql'`.
   */
  getPublicTokenHeaders: (
    props?: OverrideTokenHeaderProps &
      Pick<StorefrontClientProps, 'publicStorefrontToken'>,
  ) => Record<string, string>;
};
