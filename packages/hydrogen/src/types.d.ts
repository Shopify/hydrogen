import type {
  SessionStorage,
  Session,
  SessionData,
  FlashSessionData,
  RouterContextProvider,
} from 'react-router';
import type {RequestEventPayload} from './vite/request-events';
import {
  CUSTOMER_ACCOUNT_SESSION_KEY,
  BUYER_SESSION_KEY,
} from './customer/constants';
import type {BuyerInput} from '@shopify/hydrogen-react/storefront-api-types';
import type {StorefrontClient, I18nBase} from './storefront';
import type {CustomerAccount} from './customer/types';
import type {
  HydrogenCart,
  HydrogenCartCustom,
  CustomMethodsBase,
} from './cart/createCartHandler';

export interface HydrogenSessionData {
  [CUSTOMER_ACCOUNT_SESSION_KEY]: {
    accessToken?: string;
    expiresAt?: string;
    refreshToken?: string;
    codeVerifier?: string;
    idToken?: string;
    nonce?: string;
    state?: string;
    redirectPath?: string;
  };
  // for B2B buyer context
  [BUYER_SESSION_KEY]: Partial<BuyerInput>;
}

export interface HydrogenSession<
  Data = SessionData,
  FlashData = FlashSessionData,
> {
  get: Session<HydrogenSessionData & Data, FlashData>['get'];
  set: Session<HydrogenSessionData & Data, FlashData>['set'];
  unset: Session<HydrogenSessionData & Data, FlashData>['unset'];
  commit: () => ReturnType<
    SessionStorage<HydrogenSessionData & Data, FlashData>['commitSession']
  >;
  destroy?: () => ReturnType<
    SessionStorage<HydrogenSessionData & Data, FlashData>['destroySession']
  >;
  isPending?: boolean;
}

export type WaitUntil = (promise: Promise<unknown>) => void;

export interface HydrogenEnv {
  SESSION_SECRET: string;
  PUBLIC_STOREFRONT_API_TOKEN: string;
  PRIVATE_STOREFRONT_API_TOKEN: string;
  PUBLIC_STORE_DOMAIN: string;
  PUBLIC_STOREFRONT_ID: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
  PUBLIC_CHECKOUT_DOMAIN: string;
  SHOP_ID: string;
}

export type StorefrontHeaders = {
  /** A unique ID that correlates all sub-requests together. */
  requestGroupId: string | null;
  /** The IP address of the client. */
  buyerIp: string | null;
  /** The signature of the client's IP address for verification. */
  buyerIpSig: string | null;
  /** The cookie header from the client  */
  cookie: string | null;
  /** The sec-purpose or purpose header value */
  purpose: string | null;
};

export interface HydrogenRouterContextProvider<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> extends RouterContextProvider {
  /** A GraphQL client for querying the Storefront API */
  storefront: import('./storefront').Storefront<TI18n>;
  /** A GraphQL client for querying the Customer Account API */
  customerAccount: import('./customer/types').CustomerAccount;
  /** A collection of utilities used to interact with the cart */
  cart: TCustomMethods extends CustomMethodsBase
    ? import('./cart/createCartHandler').HydrogenCartCustom<TCustomMethods>
    : import('./cart/createCartHandler').HydrogenCart;
  /** Environment variables from the fetch function */
  env: TEnv;
  /** The waitUntil function for keeping requests alive */
  waitUntil?: WaitUntil;
  /** Session implementation */
  session: TSession;
}

declare global {
  interface Window {
    privacyBanner: PrivacyBanner;
    Shopify: {
      customerPrivacy: CustomerPrivacy;
    };
  }
  interface Document {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void,
    ): void;
    removeEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void,
    ): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void;
  }
  var __H2O_LOG_EVENT: undefined | ((event: RequestEventPayload) => void);
  var __remix_devServerHooks:
    | undefined
    | {getCriticalCss: (...args: unknown[]) => any};
}
