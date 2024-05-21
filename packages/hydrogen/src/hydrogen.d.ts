import type {
  SessionStorage,
  Session,
  SessionData,
  FlashSessionData,
} from '@remix-run/server-runtime';
import type {RequestEventPayload} from './vite/request-events';
import {CUSTOMER_ACCOUNT_SESSION_KEY, BUYER_SESSION_KEY} from './constants';
import type {BuyerInput} from '@shopify/hydrogen-react/storefront-api-types';

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
  dirty: boolean;
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
