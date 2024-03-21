import type {
  SessionStorage,
  Session,
  SessionData,
  FlashSessionData,
} from '@remix-run/server-runtime';

export interface HydrogenSessionData {
  customerAccount: {
    accessToken?: string;
    expiresAt?: string;
    refreshToken?: string;
    codeVerifier?: string;
    idToken?: string;
    nonce?: string;
    state?: string;
    redirectPath?: string;
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
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void;
  }
}


