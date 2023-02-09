import {SFAPI_VERSION} from './storefront-api-constants.js';

type StorefrontClientProps = {
  /** The host name of the domain (eg: `{shop}.myshopify.com`). */
  storeDomain: string;
  /** The Storefront API delegate access token. Refer to the [authentication](https://shopify.dev/api/storefront#authentication) and [delegate access token](https://shopify.dev/apps/auth/oauth/delegate-access-tokens) documentation for more details. */
  privateStorefrontToken?: string;
  /** The Storefront API access token. Refer to the [authentication](https://shopify.dev/api/storefront#authentication) documentation for more details. */
  publicStorefrontToken?: string;
  /** The Storefront API version. This should almost always be the same as the version Hydrogen React was built for. Learn more about Shopify [API versioning](https://shopify.dev/api/usage/versioning) for more details.  */
  storefrontApiVersion: string;
  /**
   * Customizes which `"content-type"` header is added when using `getPrivateTokenHeaders()` and `getPublicTokenHeaders()`. When fetching with a `JSON.stringify()`-ed `body`, use `"json"`. When fetching with a `body` that is a plain string, use `"graphql"`. Defaults to `"json"`
   *
   * Can also be customized on a call-by-call basis by passing in `'contentType'` to both `getPrivateTokenHeaders({...})` and `getPublicTokenHeaders({...})`, for example: `getPublicTokenHeaders({contentType: 'graphql'})`
   */
  contentType?: 'json' | 'graphql';
};

/**
 * The `createStorefrontClient()` function creates helpers that enable you to quickly query the Shopify Storefront API.
 *
 * When used on the server, it is recommended to use the `privateStorefrontToken` prop. When used on the client, it is recommended to use the `publicStorefrontToken` prop.
 */
export function createStorefrontClient(
  props: StorefrontClientProps
): StorefrontClientReturn {
  const {
    storeDomain,
    privateStorefrontToken,
    publicStorefrontToken,
    storefrontApiVersion,
    contentType,
  } = props;

  if (storefrontApiVersion !== SFAPI_VERSION) {
    warnOnce(
      `StorefrontClient: The Storefront API version that you're using is different than the version this build of Hydrogen React is targeting. You may run into unexpected errors if these versions don't match. Received verion: "${storefrontApiVersion}"; expected version "${SFAPI_VERSION}"`
    );
  }

  // only warn if not in a browser environment
  if (__HYDROGEN_DEV__ && !privateStorefrontToken && !globalThis.document) {
    warnOnce(
      `StorefrontClient: Using a private storefront token is recommended for server environments. Refer to the authentication https://shopify.dev/api/storefront#authentication documentation for more details.`
    );
  }

  // only warn if in a browser environment and you're using the privateStorefrontToken
  if (__HYDROGEN_DEV__ && privateStorefrontToken && globalThis) {
    warnOnce(
      `StorefrontClient: You are attempting to use a private token in an environment where it can be easily accessed by anyone. This is a security risk; please use the public token and the 'publicStorefrontToken' prop`
    );
  }

  return {
    getShopifyDomain(overrideProps) {
      return overrideProps?.storeDomain ?? storeDomain;
    },
    getStorefrontApiUrl(overrideProps) {
      const finalDomainUrl = overrideProps?.storeDomain ?? storeDomain;
      return `${finalDomainUrl}${finalDomainUrl.endsWith('/') ? '' : '/'}api/${
        overrideProps?.storefrontApiVersion ?? storefrontApiVersion
      }/graphql.json`;
    },
    getPrivateTokenHeaders(overrideProps) {
      if (!privateStorefrontToken && !overrideProps?.privateStorefrontToken) {
        throw new Error(
          `StorefrontClient: You did not pass in a 'privateStorefrontToken' while using 'getPrivateTokenHeaders()'`
        );
      }

      if (__HYDROGEN_DEV__ && !overrideProps?.buyerIp) {
        warnOnce(
          `StorefrontClient: it is recommended to pass in the 'buyerIp' property which improves analytics and data in the admin.`
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
    getPublicTokenHeaders(overrideProps) {
      if (!publicStorefrontToken && !overrideProps?.publicStorefrontToken) {
        throw new Error(
          `StorefrontClient: You did not pass in a 'publicStorefrontToken' while using 'getPublicTokenHeaders()'`
        );
      }

      const finalContentType =
        overrideProps?.contentType ?? contentType ?? 'json';

      return getPublicTokenHeadersRaw(
        finalContentType,
        storefrontApiVersion,
        overrideProps?.publicStorefrontToken ?? publicStorefrontToken ?? ''
      );
    },
  };
}

export function getPublicTokenHeadersRaw(
  contentType: 'graphql' | 'json',
  storefrontApiVersion: string,
  accessToken: string
) {
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
const warnOnce = (string: string) => {
  if (!warnings.has(string)) {
    console.warn(string);
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
    props?: Partial<Pick<StorefrontClientProps, 'storeDomain'>>
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
    >
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
      }
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
      Pick<StorefrontClientProps, 'publicStorefrontToken'>
  ) => Record<string, string>;
};
