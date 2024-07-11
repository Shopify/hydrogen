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
type CustomerAccountClientOptions = Omit<
  CustomerAccountOptions,
  'request' | 'customerAccountId' | 'customerAccountUrl'
> & {
  customerAccountId?: CustomerAccountOptions['customerAccountId'];
  customerAccountUrl?: CustomerAccountOptions['customerAccountUrl'];
};

export type ShopifyHandlerOptions<
  TI18n extends I18nBase = {language: 'EN'; country: 'US'},
  TCustomMethods extends CustomMethodsBase = {},
> = {
  env: ShopifyEnv;
  request: Request;
  storefrontClientOptions?: CreateStorefrontClientOptions<TI18n>;
  customerAccountClientOptions?: CustomerAccountClientOptions;
  cartOptions?: Omit<
    CartHandlerOptions,
    | 'storefront'
    | 'customerAccount'
    | 'getCartId'
    | 'setCartId'
    | 'customMethods'
  > & {
    getCartId?: CartHandlerOptions['getCartId'];
    setCartId?: CartHandlerOptions['setCartId'];
  } & {customMethods?: TCustomMethods};
};

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
  options: ShopifyHandlerOptions<TI18n, TCustomMethods>,
): ShopifyHandlerReturn<TI18n, TCustomMethods> {
  const {
    env,
    request,
    storefrontClientOptions = {},
    customerAccountClientOptions,
    cartOptions = {},
  } = options;

  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient<TI18n>({
    ...storefrontClientOptions,
    i18n:
      (storefrontClientOptions.i18n as TI18n) ||
      ({language: 'EN', country: 'US'} as TI18n),
    publicStorefrontToken:
      storefrontClientOptions.publicStorefrontToken ||
      env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken:
      storefrontClientOptions.privateStorefrontToken ||
      env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: storefrontClientOptions.storeDomain || env.PUBLIC_STORE_DOMAIN,
    storefrontId:
      storefrontClientOptions.storefrontId || env.PUBLIC_STOREFRONT_ID,
    storefrontHeaders:
      storefrontClientOptions.storefrontHeaders ||
      getStorefrontHeaders(request),
  });

  let customerAccount;
  if (customerAccountClientOptions) {
    /**
     * Create a client for Customer Account API.
     */
    customerAccount = createCustomerAccountClient({
      ...customerAccountClientOptions,
      request,
      customerAccountId:
        customerAccountClientOptions.customerAccountId ||
        env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
      customerAccountUrl:
        customerAccountClientOptions.customerAccountUrl ||
        env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
    });
  }

  /*
   * Create a cart handler that will be used to
   * create and update the cart in the session.
   */
  const cart = createCartHandler({
    ...cartOptions,
    storefront,
    customerAccount,
    getCartId: cartOptions.getCartId || cartGetIdDefault(request.headers),
    setCartId: cartOptions.setCartId || cartSetIdDefault(),
  });

  return {
    storefront,
    customerAccount,
    cart,
  };
}
