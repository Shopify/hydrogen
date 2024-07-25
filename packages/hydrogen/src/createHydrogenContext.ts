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
import type {
  HydrogenEnv,
  WaitUntil,
  HydrogenSession,
  StorefrontHeaders,
} from './types';
import type {CrossRuntimeRequest} from './utils/request';

export type HydrogenContextOptions<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = undefined,
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> = {
  env: TEnv;
  request: Request | CrossRuntimeRequest;
  cache?: Cache;
  waitUntil?: WaitUntil;
  session: TSession;
  i18n?: TI18n;
  logErrors?: boolean | ((error?: Error) => boolean);
  storefront?: {
    headers?: CreateStorefrontClientOptions<TI18n>['storefrontHeaders'];
    apiVersion?: CreateStorefrontClientOptions<TI18n>['storefrontApiVersion'];
    contentType?: CreateStorefrontClientOptions<TI18n>['contentType'];
  };
  customerAccount?: {
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

export interface HydrogenContext<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = undefined,
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

export interface HydrogenContextOverloads<
  TSession extends HydrogenSession,
  TCustomMethods extends CustomMethodsBase,
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount: CustomerAccount;
  cart: HydrogenCart | HydrogenCartCustom<TCustomMethods>;
  env: TEnv;
  waitUntil?: WaitUntil;
  session: TSession;
}

// type for createHydrogenContext methods
export function createHydrogenContext<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = undefined,
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
>(
  options: HydrogenContextOptions<TSession, TCustomMethods, TI18n, TEnv>,
): HydrogenContext<TSession, TCustomMethods, TI18n, TEnv>;

export function createHydrogenContext<
  TSession extends HydrogenSession,
  TCustomMethods extends CustomMethodsBase,
  TI18n extends I18nBase,
  TEnv extends HydrogenEnv = Env,
>(
  options: HydrogenContextOptions<TSession, TCustomMethods, TI18n, TEnv>,
): HydrogenContextOverloads<TSession, TCustomMethods, TI18n, TEnv> {
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
  } = options;

  if (!session) {
    console.warn(
      `[h2:warn:createHydrogenContext] A session object is required to create hydrogen context.`,
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
    storefrontApiVersion: storefrontOptions.apiVersion,

    // storefrontOptions
    storefrontHeaders:
      storefrontOptions.headers || getStorefrontHeaders(request),
    contentType: storefrontOptions.contentType,

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
    unstableB2b: customerAccountOptions?.unstableB2b,

    // defaults
    customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
    customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
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

    // defaults
    storefront,
    customerAccount,
  });

  return {
    storefront,
    customerAccount,
    cart,
    env,
    waitUntil,
    session,
  };
}

function getStorefrontHeaders(
  request: Request | CrossRuntimeRequest,
): StorefrontHeaders {
  const headers = request.headers;
  return {
    requestGroupId: (headers.get ? headers.get('request-id') : null) || null,
    buyerIp: (headers.get ? headers.get('oxygen-buyer-ip') : null) || null,
    cookie: (headers.get ? headers.get('cookie') : null) || null,
    purpose: (headers.get ? headers.get('purpose') : null) || null,
  };
}
