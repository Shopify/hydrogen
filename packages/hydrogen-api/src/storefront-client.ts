import {SFAPI_VERSION} from './api-constants.js';
import {warnOnce} from './utils/warning.js';
import {MOCK_SHOP_DOMAIN, isMockShop} from '@shopify/hydrogen-core';

export type StorefrontClientProps = {
  /** The host name of the domain (eg: `{shop}.myshopify.com`). */
  storeDomain?: string;
  /** The Storefront API delegate access token. Refer to the [authentication](https://shopify.dev/api/storefront#authentication) and [delegate access token](https://shopify.dev/apps/auth/oauth/delegate-access-tokens) documentation for more details. */
  privateStorefrontToken?: string;
  /** The Storefront API access token. Refer to the [authentication](https://shopify.dev/api/storefront#authentication) documentation for more details. */
  publicStorefrontToken?: string;
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
 *
 * The Storefront API version is pinned to the version this build of
 * `@shopify/hydrogen-api` targets (`SFAPI_VERSION`) and cannot be
 * overridden. Internally-generated queries (cart, customer, etc.) are
 * typed against that version, so mixing versions produces responses
 * that don't match the typed shape.
 */
export function createStorefrontClient({
  storeDomain,
  privateStorefrontToken,
  publicStorefrontToken,
  contentType,
}: StorefrontClientProps): StorefrontClientReturn {
  if (!storeDomain) {
    if (process.env.NODE_ENV !== 'production') {
      storeDomain = MOCK_SHOP_DOMAIN;
      warnOnce(`storeDomain missing, defaulting to mock data`, 'info');
    } else {
      throw new Error(
        H2_PREFIX_ERROR +
          `\`storeDomain\` is required when creating a new Storefront client in production.`,
      );
    }
  }

  // only warn if not in a browser environment
  if (
    process.env.NODE_ENV !== 'production' &&
    !privateStorefrontToken &&
    !globalThis.document &&
    !isMockShop(storeDomain)
  ) {
    warnOnce(
      `Using a private storefront token is recommended for server environments.` +
        `\nRefer to the authentication https://shopify.dev/api/storefront#authentication documentation for more details.`,
    );
  }

  // Hard-stop private tokens from reaching browser runtimes. The private
  // token grants authenticated server-side access — if it lands in a
  // client bundle, anyone who views the bundle can reuse it against the
  // store. This fires in both development and production on purpose:
  // a missed review in dev should not ship a leaked token in prod.
  if (privateStorefrontToken && typeof globalThis.document !== 'undefined') {
    throw new Error(
      H2_PREFIX_ERROR +
        '`privateStorefrontToken` was passed in a browser context. Private tokens grant ' +
        'authenticated, server-side access and must never appear in a client bundle — ' +
        'anyone who views the bundle can reuse the token. Use `publicStorefrontToken` in ' +
        'browser code, or move this call to a server route. See ' +
        'https://shopify.dev/docs/api/usage/authentication for details.',
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

      return `${apiUrl}/${SFAPI_VERSION}/graphql.json`;
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

      if (process.env.NODE_ENV !== 'production' && !overrideProps?.buyerIp) {
        warnOnce(
          'It is recommended to pass in the `buyerIp` property which improves analytics and data in the admin.',
        );
      }

      const finalContentType =
        overrideProps?.contentType ?? contentType ?? 'json';

      return {
        // default to json
        'content-type':
          finalContentType === 'graphql'
            ? 'application/graphql'
            : 'application/json',
        'X-SDK-Variant': 'hydrogen-api',
        'X-SDK-Variant-Source': 'api',
        'X-SDK-Version': SFAPI_VERSION,
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
        overrideProps?.publicStorefrontToken ?? publicStorefrontToken ?? '',
      );
    },
  };
}

function getPublicTokenHeadersRaw(
  contentType: 'graphql' | 'json',
  accessToken: string,
): {
  'content-type': string;
  'X-SDK-Variant': string;
  'X-SDK-Variant-Source': string;
  'X-SDK-Version': string;
  'X-Shopify-Storefront-Access-Token': string;
} {
  return {
    // default to json
    'content-type':
      contentType === 'graphql' ? 'application/graphql' : 'application/json',
    'X-SDK-Variant': 'hydrogen-api',
    'X-SDK-Variant-Source': 'api',
    'X-SDK-Version': SFAPI_VERSION,
    'X-Shopify-Storefront-Access-Token': accessToken,
  };
}

const H2_PREFIX_ERROR = '[h2:error:createStorefrontClient] ';

type OverrideTokenHeaderProps = Partial<
  Pick<StorefrontClientProps, 'contentType'>
>;

export type StorefrontClientReturn = {
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
   */
  getStorefrontApiUrl: (
    props?: Partial<Pick<StorefrontClientProps, 'storeDomain'>>,
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
