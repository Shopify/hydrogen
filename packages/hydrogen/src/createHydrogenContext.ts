import {
  createStorefrontClient,
  type CreateStorefrontClientOptions,
  type StorefrontClient,
  type I18nBase,
} from './storefront';
import {createCustomerAccountClient} from './customer/customer';
import {
  type CustomerAccountOptions,
  type CustomerAccount,
} from './customer/types';
import {LanguageCode} from '@shopify/hydrogen-react/customer-account-api-types';
import {
  createCartHandler,
  type CartHandlerOptions,
  type CustomMethodsBase,
  type HydrogenCart,
  type HydrogenCartCustom,
} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import type {
  HydrogenEnv,
  WaitUntil,
  HydrogenSession,
  StorefrontHeaders,
  HydrogenRouterContextProvider,
} from './types';
import {type CrossRuntimeRequest, getHeader} from './utils/request';
import {warnOnce} from './utils/warning';
import type {CartBuyerIdentityInput} from '@shopify/hydrogen-react/storefront-api-types';
import {unstable_RouterContextProvider} from 'react-router';
import {
  storefrontContext,
  cartContext,
  customerAccountContext,
  envContext,
  sessionContext,
  waitUntilContext,
} from './context-keys';

export type HydrogenContextOptions<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> = {
  /* Environment variables from the fetch function */
  env: TEnv;
  /* Request object from the fetch function */
  request: CrossRuntimeRequest;
  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */
  cache?: Cache;
  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil?: WaitUntil;
  /** Any cookie implementation. By default Hydrogen ships with cookie session storage, but you can use [another session storage](https://remix.run/docs/en/main/utils/sessions) implementation.  */
  session: TSession;
  /** An object containing a country code and language code */
  i18n?: TI18n;
  /** Whether it should print GraphQL errors automatically. Defaults to true */
  logErrors?: boolean | ((error?: Error) => boolean);
  /** Storefront client overwrite options. See documentation for createStorefrontClient for more information. */
  storefront?: {
    /** Storefront API headers. Default values set from request header.  */
    headers?: CreateStorefrontClientOptions<TI18n>['storefrontHeaders'];
    /** Override the Storefront API version for this query. */
    apiVersion?: CreateStorefrontClientOptions<TI18n>['storefrontApiVersion'];
  };
  /** Customer Account client overwrite options. See documentation for createCustomerAccountClient for more information. */
  customerAccount?: {
    /** Override the version of the API */
    apiVersion?: CustomerAccountOptions['customerApiVersion'];
    /** This is the route in your app that authorizes the customer after logging in. Make sure to call `customer.authorize()` within the loader on this route. It defaults to `/account/authorize`. */
    authUrl?: CustomerAccountOptions['authUrl'];
    /** Use this method to overwrite the default logged-out redirect behavior. The default handler [throws a redirect](https://remix.run/docs/en/main/utils/redirect#:~:text=!session) to `/account/login` with current path as `return_to` query param. */
    customAuthStatusHandler?: CustomerAccountOptions['customAuthStatusHandler'];
    /** Deprecated. `unstableB2b` is now stable. Please remove. */
    unstableB2b?: CustomerAccountOptions['unstableB2b'];
  };
  /** Cart handler overwrite options. See documentation for createCartHandler for more information. */
  cart?: {
    /** A function that returns the cart id in the form of `gid://shopify/Cart/c1-123`. */
    getId?: CartHandlerOptions['getCartId'];
    /** A function that sets the cart ID. */
    setId?: CartHandlerOptions['setCartId'];
    /**
     * The cart query fragment used by `cart.get()`.
     * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-cart-fragments) in the documentation.
     */
    queryFragment?: CartHandlerOptions['cartQueryFragment'];
    /**
     * The cart mutation fragment used in most mutation requests, except for `setMetafields` and `deleteMetafield`.
     * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-cart-fragments) in the documentation.
     */
    mutateFragment?: CartHandlerOptions['cartMutateFragment'];
    /**
     * Define custom methods or override existing methods for your cart API instance.
     * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-custom-methods) in the documentation.
     */
    customMethods?: TCustomMethods;
  };
  buyerIdentity?: CartBuyerIdentityInput;
};

export interface HydrogenContext<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> {
  /** A GraphQL client for querying the [Storefront API](https://shopify.dev/docs/api/storefront). */
  storefront: StorefrontClient<TI18n>['storefront'];
  /** A GraphQL client for querying the [Customer Account API](https://shopify.dev/docs/api/customer). It also provides methods to authenticate and check if the user is logged in. */
  customerAccount: CustomerAccount;
  /** A collection of utilities used to interact with the cart. */
  cart: TCustomMethods extends CustomMethodsBase
    ? HydrogenCartCustom<TCustomMethods>
    : HydrogenCart;
  /* Request object from the fetch function */
  env: TEnv;
  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil?: WaitUntil;
  /** Any cookie implementation. By default Hydrogen ships with cookie session storage, but you can use [another session storage](https://remix.run/docs/en/main/utils/sessions) implementation.  */
  session: TSession;
}

export interface HydrogenContextOverloads<
  TSession extends HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount: CustomerAccount;
  cart: TCustomMethods extends CustomMethodsBase
    ? HydrogenCartCustom<TCustomMethods>
    : HydrogenCart;
  env: TEnv;
  waitUntil?: WaitUntil;
  session: TSession;
}

export function createHydrogenContext<
  TSession extends HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
  TAdditionalContext extends Record<string, any> = {},
>(
  options: HydrogenContextOptions<TSession, TCustomMethods, TI18n, TEnv>,
  additionalContext?: TAdditionalContext,
): HydrogenRouterContextProvider<TSession, TCustomMethods, TI18n, TEnv> &
  TAdditionalContext {
  const {
    env,
    request,
    cache,
    waitUntil,
    i18n,
    session,
    logErrors,
    storefront: storefrontOptions = {},
    customerAccount: customerAccountOptions,
    cart: cartOptions = {},
    buyerIdentity,
  } = options;

  if (!session) {
    console.warn(
      `[h2:warn:createHydrogenContext] A session object is required to create hydrogen context.`,
    );
  }

  if (customerAccountOptions?.unstableB2b) {
    warnOnce(
      '[h2:warn:createHydrogenContext] `customerAccount.unstableB2b` is now stable. Please remove the `unstableB2b` option.',
    );
  }

  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient<TI18n>({
    // share options
    cache,
    waitUntil,
    i18n,
    logErrors,

    // storefrontOptions
    storefrontHeaders:
      storefrontOptions.headers || getStorefrontHeaders(request),
    storefrontApiVersion: storefrontOptions.apiVersion,

    // defaults
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
  });

  const customerAccount = createCustomerAccountClient({
    // share options
    session,
    request,
    waitUntil,
    logErrors,

    // customerAccountOptions
    customerApiVersion: customerAccountOptions?.apiVersion,
    authUrl: customerAccountOptions?.authUrl,
    customAuthStatusHandler: customerAccountOptions?.customAuthStatusHandler,

    // locale - i18n.language is a union of StorefrontLanguageCode | CustomerLanguageCode
    // We cast here because createCustomerAccountClient expects CustomerLanguageCode specifically,
    // but the union type is compatible since most language codes overlap between the two APIs
    language: i18n?.language as LanguageCode | undefined,

    // defaults
    customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
    shopId: env.SHOP_ID,
  });

  /*
   * Create a cart handler that will be used to
   * create and update the cart in the session.
   */
  const cart = createCartHandler({
    // cartOptions
    getCartId: cartOptions.getId || cartGetIdDefault(request.headers),
    setCartId: cartOptions.setId || cartSetIdDefault(),
    cartQueryFragment: cartOptions.queryFragment,
    cartMutateFragment: cartOptions.mutateFragment,
    customMethods: cartOptions.customMethods,
    buyerIdentity,

    // defaults
    storefront,
    customerAccount,
  });

  // Create React Router context provider
  const routerProvider = new unstable_RouterContextProvider();

  // Set React Router context keys (enables context.get(storefrontContext))
  routerProvider.set(storefrontContext, storefront);
  routerProvider.set(cartContext, cart);
  routerProvider.set(customerAccountContext, customerAccount);
  routerProvider.set(envContext, env);
  routerProvider.set(sessionContext, session);
  if (waitUntil) {
    routerProvider.set(waitUntilContext, waitUntil);
  }

  // Create Hydrogen services map for direct property access
  const services = {
    storefront,
    cart,
    customerAccount,
    env,
    session,
    waitUntil,
    // Merge additional context properties (CMS clients, 3P SDKs, etc.)
    ...(additionalContext || {}),
  };

  // Create Proxy for hybrid access pattern - cleanest approach
  const hybridProvider = new Proxy(routerProvider, {
    get(target, prop, receiver) {
      // If it's a React Router method or property, use the target
      if (prop in target) {
        const value = target[prop as keyof typeof target];
        // Bind methods to preserve 'this' context
        return typeof value === 'function' ? value.bind(target) : value;
      }

      // If it's a Hydrogen service property, return from services
      if (prop in services) {
        return services[prop as keyof typeof services];
      }

      // Default behavior for other properties
      return Reflect.get(target, prop, receiver);
    },

    has(target, prop) {
      // Property exists if it's in target OR services
      return prop in target || prop in services;
    },

    ownKeys(target) {
      // Return all keys from both target and services
      return [...Reflect.ownKeys(target), ...Object.keys(services)];
    },

    getOwnPropertyDescriptor(target, prop) {
      // If property exists on target, return its descriptor
      if (prop in target) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }

      // If property exists in services, return a descriptor that makes it enumerable
      if (prop in services) {
        return {
          enumerable: true,
          configurable: true,
          writable: false,
          value: services[prop as keyof typeof services],
        };
      }

      // Property doesn't exist
      return undefined;
    },
  });

  return hybridProvider as HydrogenRouterContextProvider<
    TSession,
    TCustomMethods,
    TI18n,
    TEnv
  > &
    TAdditionalContext;
}

function getStorefrontHeaders(request: CrossRuntimeRequest): StorefrontHeaders {
  return {
    requestGroupId: getHeader(request, 'request-id'),
    buyerIp: getHeader(request, 'oxygen-buyer-ip'),
    cookie: getHeader(request, 'cookie'),
    purpose: getHeader(request, 'purpose'),
  };
}

export type HydrogenContextOptionsForDocs<
  TSession extends HydrogenSession = HydrogenSession,
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> = {
  /* Environment variables from the fetch function */
  env: TEnv;
  /* Request object from the fetch function */
  request: CrossRuntimeRequest;
  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */
  cache?: Cache;
  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil?: WaitUntil;
  /** Any cookie implementation. By default Hydrogen ships with cookie session storage, but you can use [another session storage](https://remix.run/docs/en/main/utils/sessions) implementation.  */
  session: TSession;
  /** An object containing a country code and language code */
  i18n?: TI18n;
  /** Whether it should print GraphQL errors automatically. Defaults to true */
  logErrors?: boolean | ((error?: Error) => boolean);
  /** Storefront client overwrite options. See documentation for createStorefrontClient for more information. */
  storefront?: {
    /** Storefront API headers. Default values set from request header.  */
    headers?: StorefrontHeaders;
    /** Override the Storefront API version for this query. */
    apiVersion?: string;
  };
  /** Customer Account client overwrite options. See documentation for createCustomerAccountClient for more information. */
  customerAccount?: {
    /** Override the version of the API */
    apiVersion?: string;
    /** This is the route in your app that authorizes the customer after logging in. Make sure to call `customer.authorize()` within the loader on this route. It defaults to `/account/authorize`. */
    authUrl?: string;
    /** Use this method to overwrite the default logged-out redirect behavior. The default handler [throws a redirect](https://remix.run/docs/en/main/utils/redirect#:~:text=!session) to `/account/login` with current path as `return_to` query param. */
    customAuthStatusHandler?: () => Response | NonNullable<unknown> | null;
    /** Deprecated. `unstableB2b` is now stable. Please remove. */
    unstableB2b?: boolean;
  };
  /** Cart handler overwrite options. See documentation for createCartHandler for more information. */
  cart?: {
    /** A function that returns the cart id in the form of `gid://shopify/Cart/c1-123`. */
    getId?: () => string | undefined;
    /** A function that sets the cart ID. */
    setId?: (cartId: string) => Headers;
    /**
     * The cart query fragment used by `cart.get()`.
     * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-cart-fragments) in the documentation.
     */
    queryFragment?: string;
    /**
     * The cart mutation fragment used in most mutation requests, except for `setMetafields` and `deleteMetafield`.
     * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-cart-fragments) in the documentation.
     */
    mutateFragment?: string;
    /**
     * Define custom methods or override existing methods for your cart API instance.
     * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-custom-methods) in the documentation.
     */
    customMethods?: Record<string, Function>;
  };
  /**
   * Buyer identity. Default buyer identity is passed to cartCreate.
   */
  buyerIdentity?: CartBuyerIdentityInput;
};
