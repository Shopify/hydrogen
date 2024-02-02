import type {HMRPayload} from 'vite';
import type {FetchResult} from 'vite/runtime';

export type ClientFunctions = {
  hmrSend(payload: HMRPayload): void;
};

export type ServerFunctions = {
  hmrSend(payload: HMRPayload): void;
};
