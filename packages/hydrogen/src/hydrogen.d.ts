import type {
  SessionStorage,
  Session,
  SessionData,
  FlashSessionData,
} from '@remix-run/server-runtime';
import type {RequestEventPayload} from './vite/request-events';

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
  var __H2O_LOG_EVENT: undefined | ((event: RequestEventPayload) => void);
  var __remix_devServerHooks:
    | undefined
    | {getCriticalCss: (...args: unknown[]) => any};
}
