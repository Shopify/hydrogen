import app from '../../../templates/skeleton/server';
import {handlers} from './handlers';

function ensureLocalStorage() {
  if ('localStorage' in globalThis) {
    return;
  }

  const store = new Map<string, string>();

  const localStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: false,
    value: localStorage,
    writable: false,
  });
}

ensureLocalStorage();

function ensureBroadcastChannel() {
  if ('BroadcastChannel' in globalThis) {
    return;
  }

  class NoopBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onmessageerror: ((event: MessageEvent) => void) | null = null;

    constructor(name: string) {
      this.name = name;
    }

    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
    postMessage() {}
    close() {}
  }

  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    enumerable: false,
    value: NoopBroadcastChannel,
    writable: false,
  });
}

ensureBroadcastChannel();

const {getResponse} = await import('msw');

const installedKey = Symbol.for('hydrogen.e2e.msw.installed');

type MswGlobal = typeof globalThis & {
  [installedKey]?: boolean;
};

const mswGlobal = globalThis as MswGlobal;

if (!mswGlobal[installedKey]) {
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    if (handlers.length > 0) {
      let request: Request | null = null;

      try {
        request = input instanceof Request ? input : new Request(input, init);
      } catch {
        request = null;
      }

      if (request) {
        const mockedResponse = await getResponse(handlers, request);

        if (mockedResponse) {
          return mockedResponse;
        }
      }
    }

    return originalFetch(input, init);
  };

  mswGlobal[installedKey] = true;
  console.log(
    `[e2e-msw] Installed fetch interceptor with ${handlers.length} handlers`,
  );
}

export default app;
