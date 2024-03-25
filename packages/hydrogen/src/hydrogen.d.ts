import type {
  SessionStorage,
  Session,
  SessionData,
  FlashSessionData,
} from '@remix-run/server-runtime';
import {CUSTOMER_ACCOUNT_SESSION_KEY} from './constants';

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
  [BUYER_SESSION_KEY]: {
    customerAccessToken?: string;
    companyLocationId?: string;
  };
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
}
