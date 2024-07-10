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
  type CartHandlerOptionsWithCustom,
  type CustomMethodsBase,
  type CartHandlerReturn,
} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import type {ShopifyEnv} from './types';

type OptionsBase<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> = {
  env: ShopifyEnv;
  request: Request;
} & CreateStorefrontClientOptions<TI18n> &
  (
    | (Omit<
        CartHandlerOptions,
        'storefront' | 'customerAccount' | 'getCartId' | 'setCartId'
      > & {
        getCartId?: CartHandlerOptions['getCartId'];
        setCartId?: CartHandlerOptions['setCartId'];
      })
    | (Omit<
        CartHandlerOptionsWithCustom<TCustomMethods>,
        'storefront' | 'customerAccount' | 'getCartId' | 'setCartId'
      > & {
        getCartId?: CartHandlerOptionsWithCustom<TCustomMethods>['getCartId'];
        setCartId?: CartHandlerOptionsWithCustom<TCustomMethods>['setCartId'];
      })
  );

type OptionsWithCustomerAccount<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> = OptionsBase<TI18n, TCustomMethods> & {
  useCustomerAccountAPI?: true;
} & Omit<
    CustomerAccountOptions,
    'request' | 'customerAccountId' | 'customerAccountUrl'
  > & {
    customerAccountId?: CustomerAccountOptions['customerAccountId'];
    customerAccountUrl?: CustomerAccountOptions['customerAccountUrl'];
  };

type OptionsWithOutCustomerAccount<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> = OptionsBase<TI18n, TCustomMethods> & {
  useCustomerAccountAPI: false;
};

export type ShopifyHandlerOptions<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> =
  | OptionsWithCustomerAccount<TI18n, TCustomMethods>
  | OptionsWithOutCustomerAccount<TI18n, TCustomMethods>;

export interface ShopifyHandlerWithCustomerAccount<
  TI18n extends I18nBase = {language: 'EN'; country: 'US'},
  TCustomMethods extends CustomMethodsBase = {},
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount: CustomerAccount;
  cart: CartHandlerReturn<TCustomMethods>;
}

export interface ShopifyHandlerWithOutCustomerAccount<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount?: undefined;
  cart: CartHandlerReturn<TCustomMethods>;
}
export type ShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> =
  | ShopifyHandlerWithCustomerAccount<TI18n, TCustomMethods>
  | ShopifyHandlerWithOutCustomerAccount<TI18n, TCustomMethods>;

export function createShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: OptionsWithCustomerAccount<TI18n, TCustomMethods>,
): ShopifyHandlerWithCustomerAccount<TI18n, TCustomMethods>;

export function createShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: OptionsWithOutCustomerAccount<TI18n, TCustomMethods>,
): ShopifyHandlerWithOutCustomerAccount<TI18n, TCustomMethods>;

export function createShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: ShopifyHandlerOptions<TI18n, TCustomMethods>,
): ShopifyHandler<TI18n, TCustomMethods> {
  const {env, request} = options;

  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient({
    ...options,
    i18n: options.i18n || ({language: 'EN', country: 'US'} as TI18n),
    publicStorefrontToken:
      options.publicStorefrontToken || env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken:
      options.privateStorefrontToken || env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: options.storeDomain || env.PUBLIC_STORE_DOMAIN,
    storefrontId: options.storefrontId || env.PUBLIC_STOREFRONT_ID,
    storefrontHeaders:
      options.storefrontHeaders || getStorefrontHeaders(request),
  });

  let customerAccount;
  if (hasCustomerAccountAPI(options)) {
    /**
     * Create a client for Customer Account API.
     */
    customerAccount = createCustomerAccountClient({
      ...options,
      customerAccountId:
        options.customerAccountId || env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
      customerAccountUrl:
        options.customerAccountUrl || env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
    });
  }

  /*
   * Create a cart handler that will be used to
   * create and update the cart in the session.
   */
  const cart = createCartHandler({
    ...options,
    storefront,
    customerAccount,
    getCartId: options.getCartId || cartGetIdDefault(request.headers),
    setCartId: options.setCartId || cartSetIdDefault(),
  });

  return {storefront, customerAccount, cart};
}

function hasCustomerAccountAPI<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options:
    | OptionsWithCustomerAccount<TI18n, TCustomMethods>
    | OptionsWithOutCustomerAccount<TI18n, TCustomMethods>,
): options is OptionsWithCustomerAccount<TI18n, TCustomMethods> {
  return options.useCustomerAccountAPI !== false;
}
