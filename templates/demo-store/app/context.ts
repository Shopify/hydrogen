import {createMiddlewareContext} from '@shopify/remix-oxygen';
import type {Storefront} from '@shopify/hydrogen';
import type {HydrogenSession} from '~/lib/session.server';
import {I18nLocale} from './lib/type';

export const hydrogenContext = createMiddlewareContext<{
  waitUntil: ExecutionContext['waitUntil'];
  session: HydrogenSession;
  storefront: Storefront<I18nLocale>;
}>();

export type Env = {
  SESSION_SECRET: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PRIVATE_STOREFRONT_API_TOKEN: string;
  PUBLIC_STOREFRONT_API_VERSION: string;
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_ID: string;
};

export const oxygenContext = createMiddlewareContext<{
  waitUntil: ExecutionContext['waitUntil'];
  cache: Cache;
  env: Env;
}>();
