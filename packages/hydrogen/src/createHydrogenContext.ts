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
import {
  createCartHandler,
  type CartHandlerOptions,
  type CustomMethodsBase,
  type HydrogenCart,
  type HydrogenCartCustom,
} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import {getStorefrontHeaders} from './getStorefrontHeaders';
import type {HydrogenEnv, WaitUntil, HydrogenSession} from './types';
import type {CrossRuntimeRequest} from './utils/request';

export type HydrogenContextOptions<
  TI18n extends I18nBase = {language: 'EN'; country: 'US'},
  TUseStorefrontForCustomerAccount extends undefined | boolean = false,
  TCustomMethods extends CustomMethodsBase | undefined = undefined,
> = {
  env: HydrogenEnv;
  request: Request | CrossRuntimeRequest;
  cache?: Cache;
  waitUntil?: WaitUntil;
  session?: TUseStorefrontForCustomerAccount extends true
    ? undefined
    : HydrogenSession;
  i18n?: TI18n;
  logErrors?: boolean | ((error?: Error) => boolean);
  storefront?: {
    headers?: CreateStorefrontClientOptions<TI18n>['storefrontHeaders'];
    apiVersion?: CreateStorefrontClientOptions<TI18n>['storefrontApiVersion'];
    contentType?: CreateStorefrontClientOptions<TI18n>['contentType'];
  };
  customerAccount?: {
    useStorefrontAPI?: TUseStorefrontForCustomerAccount;
    apiVersion?: CustomerAccountOptions['customerApiVersion'];
    authUrl?: CustomerAccountOptions['authUrl'];
    customAuthStatusHandler?: CustomerAccountOptions['customAuthStatusHandler'];
    unstableB2b?: CustomerAccountOptions['unstableB2b'];
  };
  cart?: {
    getId?: CartHandlerOptions['getCartId'];
    setId?: CartHandlerOptions['setCartId'];
    queryFragment?: CartHandlerOptions['cartQueryFragment'];
    mutateFragment?: CartHandlerOptions['cartMutateFragment'];
    customMethods?: TCustomMethods;
  };
};

export interface HydrogenContextReturnConditional<
  TI18n extends I18nBase = {language: 'EN'; country: 'US'},
  TUseStorefrontForCustomerAccount extends undefined | boolean = false,
  TCustomMethods extends CustomMethodsBase | undefined = undefined,
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount: TUseStorefrontForCustomerAccount extends true
    ? undefined
    : CustomerAccount;
  cart: TCustomMethods extends CustomMethodsBase
    ? HydrogenCartCustom<TCustomMethods>
    : HydrogenCart;
}

export interface HydrogenContextReturn<
  TI18n extends I18nBase,
  TCustomMethods extends CustomMethodsBase,
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount: CustomerAccount | undefined;
  cart: HydrogenCart | HydrogenCartCustom<TCustomMethods>;
}

// type for createHydrogenContext methods
export function createHydrogenContext<
  TI18n extends I18nBase = {language: 'EN'; country: 'US'},
  TCustomMethods extends CustomMethodsBase | undefined = undefined,
  TUseStorefrontForCustomerAccount extends undefined | boolean = false,
>(
  options: HydrogenContextOptions<
    TI18n,
    TUseStorefrontForCustomerAccount,
    TCustomMethods
  >,
): HydrogenContextReturnConditional<
  TI18n,
  TUseStorefrontForCustomerAccount,
  TCustomMethods
>;

export function createHydrogenContext<
  TI18n extends I18nBase,
  TUseStorefrontForCustomerAccount extends undefined | boolean,
  TCustomMethods extends CustomMethodsBase,
>(
  options: HydrogenContextOptions<
    TI18n,
    TUseStorefrontForCustomerAccount,
    TCustomMethods
  >,
): HydrogenContextReturn<TI18n, TCustomMethods> {
  const {
    env,
    storefront: storefrontOptions = {},
    customerAccount: customerAccountOptions,
    cart: cartOptions = {},
    ...shareOptions
  } = options;

  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient<TI18n>({
    // share options
    cache: shareOptions.cache,
    waitUntil: shareOptions.waitUntil,
    i18n:
      (shareOptions.i18n as TI18n) ||
      ({language: 'EN', country: 'US'} as TI18n),
    logErrors: shareOptions.logErrors,
    storefrontApiVersion: storefrontOptions.apiVersion,

    // storefrontOptions
    storefrontHeaders:
      storefrontOptions.headers || getStorefrontHeaders(shareOptions.request),
    contentType: storefrontOptions.contentType,

    // defaults
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
  });

  let customerAccount: CustomerAccount | undefined;
  const useStorefrontForCustomerAccount =
    customerAccountOptions?.useStorefrontAPI || false;
  if (shareOptions.session && !useStorefrontForCustomerAccount) {
    /**
     * Create a client for Customer Account API.
     */
    customerAccount = createCustomerAccountClient({
      // share options
      session: shareOptions.session,
      request: shareOptions.request,
      waitUntil: shareOptions.waitUntil,
      logErrors: shareOptions.logErrors,

      // customerAccountOptions
      customerApiVersion: customerAccountOptions?.apiVersion,
      authUrl: customerAccountOptions?.authUrl,
      customAuthStatusHandler: customerAccountOptions?.customAuthStatusHandler,
      unstableB2b: customerAccountOptions?.unstableB2b,

      // defaults
      customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
      customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
    });
  }

  /*
   * Create a cart handler that will be used to
   * create and update the cart in the session.
   */
  const cart = createCartHandler({
    // cartOptions
    getCartId:
      cartOptions.getId || cartGetIdDefault(shareOptions.request.headers),
    setCartId: cartOptions.setId || cartSetIdDefault(),
    cartQueryFragment: cartOptions.queryFragment,
    cartMutateFragment: cartOptions.mutateFragment,
    customMethods: cartOptions.customMethods,

    // defaults
    storefront,
    customerAccount,
  });

  return {
    storefront,
    customerAccount,
    cart,
  };
}
