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
  type HydrogenCart,
  type HydrogenCartCustom,
} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import type {ShopifyEnv} from './types';

// type for Options
type OptionsBase<TI18n extends I18nBase> = {
  env: ShopifyEnv;
  request: Request;
} & CreateStorefrontClientOptions<TI18n>;

type OptionsWithCustomerAccount = {
  useCustomerAccountAPI?: true;
} & Omit<
  CustomerAccountOptions,
  'request' | 'customerAccountId' | 'customerAccountUrl'
> & {
    customerAccountId?: CustomerAccountOptions['customerAccountId'];
    customerAccountUrl?: CustomerAccountOptions['customerAccountUrl'];
  };

type OptionsWithoutCustomerAccount = {
  useCustomerAccountAPI: false;
};

type OptionsWithCartCustomMethods<TCustomMethods extends CustomMethodsBase> =
  Omit<
    CartHandlerOptionsWithCustom<TCustomMethods>,
    | 'storefront'
    | 'customerAccount'
    | 'getCartId'
    | 'setCartId'
    | 'customMethods'
  > & {
    getCartId?: CartHandlerOptionsWithCustom<TCustomMethods>['getCartId'];
    setCartId?: CartHandlerOptionsWithCustom<TCustomMethods>['setCartId'];
    customMethods: TCustomMethods;
  };

type OptionsWithoutCartCustomMethods = Omit<
  CartHandlerOptions,
  'storefront' | 'customerAccount' | 'getCartId' | 'setCartId' | 'customMethods'
> & {
  getCartId?: CartHandlerOptions['getCartId'];
  setCartId?: CartHandlerOptions['setCartId'];
};

export type ShopifyHandlerOptions<
  TI18n extends I18nBase = {language: 'EN'; country: 'US'},
  TCustomMethods extends CustomMethodsBase = {},
> = OptionsBase<TI18n> &
  (OptionsWithCustomerAccount | OptionsWithoutCustomerAccount) &
  (
    | OptionsWithoutCartCustomMethods
    | OptionsWithCartCustomMethods<TCustomMethods>
  );

// type for Returns
interface HandlerReturnBase<TI18n extends I18nBase> {
  storefront: StorefrontClient<TI18n>['storefront'];
}

interface HandlerReturnWithCustomerAccount {
  customerAccount: CustomerAccount;
}
interface HandlerReturnWithoutCustomerAccount {}
type HandlerReturnCustomerAccount =
  | HandlerReturnWithCustomerAccount
  | HandlerReturnWithoutCustomerAccount;

interface HandlerReturnWithCartCustomMethods<
  TCustomMethods extends CustomMethodsBase,
> {
  cart: HydrogenCartCustom<TCustomMethods>;
}
interface HandlerReturnWithoutCartCustomMethods {
  cart: HydrogenCart;
}
type HandlerReturnCartCustomMethods<TCustomMethods extends CustomMethodsBase> =
  | HandlerReturnWithCartCustomMethods<TCustomMethods>
  | HandlerReturnWithoutCartCustomMethods;

export type ShopifyHandlerReturn<
  TI18n extends I18nBase = {language: 'EN'; country: 'US'},
  TCustomMethods extends CustomMethodsBase = {},
> = HandlerReturnBase<TI18n> &
  HandlerReturnCustomerAccount &
  HandlerReturnCartCustomMethods<TCustomMethods>;

// type for createShopifyHandler methods
export function createShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: OptionsBase<TI18n> &
    OptionsWithCustomerAccount &
    OptionsWithCartCustomMethods<TCustomMethods>,
): HandlerReturnBase<TI18n> &
  HandlerReturnWithCustomerAccount &
  HandlerReturnWithCartCustomMethods<TCustomMethods>;

export function createShopifyHandler<TI18n extends I18nBase>(
  options: OptionsBase<TI18n> &
    OptionsWithCustomerAccount &
    OptionsWithoutCartCustomMethods,
): HandlerReturnBase<TI18n> &
  HandlerReturnWithCustomerAccount &
  HandlerReturnWithoutCartCustomMethods;

export function createShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: OptionsBase<TI18n> &
    OptionsWithoutCustomerAccount &
    OptionsWithCartCustomMethods<TCustomMethods>,
): HandlerReturnBase<TI18n> &
  HandlerReturnWithoutCustomerAccount &
  HandlerReturnWithCartCustomMethods<TCustomMethods>;

export function createShopifyHandler<TI18n extends I18nBase>(
  options: OptionsBase<TI18n> &
    OptionsWithoutCustomerAccount &
    OptionsWithoutCartCustomMethods,
): HandlerReturnBase<TI18n> &
  HandlerReturnWithoutCustomerAccount &
  HandlerReturnWithoutCartCustomMethods;

export function createShopifyHandler<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: ShopifyHandlerOptions<TI18n, TCustomMethods>,
): ShopifyHandlerReturn<TI18n, TCustomMethods> {
  const {env, request} = options;

  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient<TI18n>({
    ...options,
    i18n: (options.i18n as TI18n) || ({language: 'EN', country: 'US'} as TI18n),
    publicStorefrontToken:
      options.publicStorefrontToken || env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken:
      options.privateStorefrontToken || env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: options.storeDomain || env.PUBLIC_STORE_DOMAIN,
    storefrontId: options.storefrontId || env.PUBLIC_STOREFRONT_ID,
    storefrontHeaders:
      options.storefrontHeaders || getStorefrontHeaders(request),
  });

  let customerAccount: CustomerAccount | undefined = undefined;
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

  return {
    storefront,
    customerAccount,
    cart,
  };
}

// Type Predicate Functions
function hasCustomerAccountAPI<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
>(
  options: ShopifyHandlerOptions<TI18n, TCustomMethods>,
): options is OptionsBase<TI18n> &
  OptionsWithCustomerAccount &
  (
    | OptionsWithoutCartCustomMethods
    | OptionsWithCartCustomMethods<TCustomMethods>
  ) {
  return options.useCustomerAccountAPI !== false;
}
