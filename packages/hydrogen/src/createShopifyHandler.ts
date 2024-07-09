import {getStorefrontHeaders} from '@shopify/remix-oxygen';

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
  type CustomMethodsBase,
  type CartHandlerReturn,
} from './cart/createCartHandler';
import {cartGetIdDefault} from './cart/cartGetIdDefault';
import {cartSetIdDefault} from './cart/cartSetIdDefault';
import type {ShopifyEnv} from './types';

export type ShopifyHandlerOptions<TI18n extends I18nBase> = {
  env: Env;
  request: Request;
} & Partial<CreateStorefrontClientOptions<TI18n>>;

export interface ShopifyHandler<TI18n extends I18nBase> {
  storefront: StorefrontClient<TI18n>['storefront'];
}

export function createShopifyHandler<TI18n extends I18nBase>(
  options: ShopifyHandlerOptions<TI18n>,
): ShopifyHandler<TI18n> {
  const {env, request, ...restOfOptions} = options;

  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient({
    ...restOfOptions,
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

  return {storefront};
}
