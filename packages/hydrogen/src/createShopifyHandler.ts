import {
  createStorefrontClient,
  type CreateStorefrontClientOptions,
  type StorefrontClient,
  type I18nBase,
} from './storefront';
import {getStorefrontHeaders} from '@shopify/remix-oxygen';
import {createCustomerAccountClient} from './customer/customer';
import {
  type CustomerAccountOptions,
  type CustomerAccount,
} from './customer/types';
import {
  createCartHandler,
  type CartHandlerOptions,
  type CustomMethodsBase,
  type HydrogenCart,
  type HydrogenCartCustom,
} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import type {ShopifyEnv, WaitUntil, HydrogenSession} from './types';

export type ShopifyHandlerOptions<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> = {
  env: ShopifyEnv;
  request: Request;
  cache?: Cache;
  waitUntil?: WaitUntil;
  session?: HydrogenSession;
  i18n?: TI18n;
  logErrors?: boolean | ((error?: Error) => boolean);
  storefrontClientOptions?: {
    storefrontHeaders?: CreateStorefrontClientOptions<TI18n>['storefrontHeaders'];
    storefrontApiVersion?: CreateStorefrontClientOptions<TI18n>['storefrontApiVersion'];
    contentType?: CreateStorefrontClientOptions<TI18n>['contentType'];
  };
  customerAccountClientOptions?: {
    useLegacy?: boolean;
    customerApiVersion?: CustomerAccountOptions['customerApiVersion'];
    authUrl?: CustomerAccountOptions['authUrl'];
    customAuthStatusHandler?: CustomerAccountOptions['customAuthStatusHandler'];
    unstableB2b?: CustomerAccountOptions['unstableB2b'];
  };
  cartOptions?: {
    getCartId?: CartHandlerOptions['getCartId'];
    setCartId?: CartHandlerOptions['setCartId'];
    cartQueryFragment?: CartHandlerOptions['cartQueryFragment'];
    cartMutateFragment?: CartHandlerOptions['cartMutateFragment'];
    customMethods?: TCustomMethods;
  };
};

export interface ShopifyHandlerReturn<
  Options extends ShopifyHandlerOptions<TI18n, TCustomMethods>,
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount: Options['session'] extends undefined
    ? undefined
    : CustomerAccount;
  cart: Options['cartOptions'] extends {customMethods: CustomMethodsBase}
    ? HydrogenCartCustom<TCustomMethods>
    : HydrogenCart;
}

// type for createShopifyHandler methods
export function createShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: ShopifyHandlerOptions<TI18n, TCustomMethods>,
): ShopifyHandlerReturn<typeof options, TI18n, TCustomMethods> {
  const {
    env,
    storefrontClientOptions = {},
    customerAccountClientOptions,
    cartOptions = {},
    ...shareOptions
  } = options;

  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient<TI18n>({
    ...shareOptions,
    ...storefrontClientOptions,
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    i18n: (options.i18n as TI18n) || ({language: 'EN', country: 'US'} as TI18n),
    storefrontHeaders:
      storefrontClientOptions.storefrontHeaders ||
      getStorefrontHeaders(shareOptions.request),
  });

  let customerAccount;
  if (!customerAccountClientOptions?.useLegacy && shareOptions.session) {
    /**
     * Create a client for Customer Account API.
     */
    customerAccount = createCustomerAccountClient({
      ...shareOptions,
      ...customerAccountClientOptions,
      session: shareOptions.session,
      customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
      customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
    });
  }

  /*
   * Create a cart handler that will be used to
   * create and update the cart in the session.
   */
  const cart = createCartHandler({
    ...shareOptions,
    ...cartOptions,
    storefront,
    customerAccount,
    getCartId:
      cartOptions.getCartId || cartGetIdDefault(shareOptions.request.headers),
    setCartId: cartOptions.setCartId || cartSetIdDefault(),
  });

  return {
    storefront,
    customerAccount,
    cart,
  } as ShopifyHandlerReturn<typeof options, TI18n, TCustomMethods>;
}
