import type {
  SessionStorage,
  Session,
  SessionData,
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

/** session must implements these interface for hydrogen utilities to work properly */
export interface HydrogenSession<Data = SessionData> {
  get: Session<HydrogenSessionData & Data>['get'];
  set: Session<HydrogenSessionData & Data>['set'];
  unset: Session<HydrogenSessionData & Data>['unset'];
  commit: () => ReturnType<
    SessionStorage<HydrogenSessionData & Data>['commitSession']
  >;
}
