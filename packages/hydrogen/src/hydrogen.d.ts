import type {
  SessionStorage,
  Session,
  SessionData,
  FlashSessionData,
} from '@remix-run/server-runtime';

export interface HydrogenSessionData {
  /** session data for customer account auth*/
  'code-verifier': string;
  customer_access_token: string;
  customer_authorization_code_token: string;
  expires_at: string;
  id_token: string;
  nonce: string;
  refresh_token: string;
  state: string;
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
