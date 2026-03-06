import {createCookieSessionStorage} from 'react-router';
import {MswScenarioMeta} from './handlers';

const installedKey = Symbol.for('hydrogen.e2e.msw.installed');
const LOCAL_STORAGE_TEST_KEY = '__hydrogen_e2e_local_storage_test__';

type ProcessLike = {
  env?: Record<string, string | undefined>;
  versions?: {node?: string};
};

type MswGlobal = typeof globalThis & {
  [installedKey]?: boolean;
  process?: ProcessLike;
};

function defineGlobal(name: string, value: unknown, writable = false) {
  try {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      enumerable: false,
      value,
      writable,
    });
  } catch {
    (globalThis as Record<string, unknown>)[name] = value;
  }
}

function hasWorkingLocalStorage() {
  try {
    globalThis.localStorage?.setItem(LOCAL_STORAGE_TEST_KEY, '1');
    globalThis.localStorage?.removeItem(LOCAL_STORAGE_TEST_KEY);
    return true;
  } catch {
    return false;
  }
}

function ensureLocalStorage() {
  if (hasWorkingLocalStorage()) return;

  const store = new Map<string, string>();

  defineGlobal('localStorage', {
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
  });
}

function ensureBroadcastChannel() {
  if ('BroadcastChannel' in globalThis) return;

  class NoopBroadcastChannel {
    constructor(public name: string) {}

    onmessage: ((event: MessageEvent) => void) | null = null;
    onmessageerror: ((event: MessageEvent) => void) | null = null;

    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
    postMessage() {}
    close() {}
  }

  defineGlobal('BroadcastChannel', NoopBroadcastChannel);
}

function ensureNodeProcessForMsw() {
  const currentProcess = (globalThis as MswGlobal).process;

  if (currentProcess?.versions?.node) {
    currentProcess.env = {...currentProcess.env, NODE_ENV: 'production'};
    return;
  }

  defineGlobal(
    'process',
    {
      env: {
        ...(currentProcess?.env ?? {}),
        NODE_ENV: 'production',
      },
      versions: {
        ...(currentProcess?.versions ?? {}),
        node: '22.0.0',
      },
    } satisfies ProcessLike,
    true,
  );
}

ensureLocalStorage();
ensureBroadcastChannel();
ensureNodeProcessForMsw();

const {getResponse} = await import('msw');
const {getHandlersForScenario} = await import('./handlers');

let currentMswScenarioMeta: MswScenarioMeta | undefined = undefined;

function toRequest(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return input instanceof Request ? input : new Request(input, init);
  } catch {
    return null;
  }
}

function installFetchInterceptor() {
  const mswGlobal = globalThis as MswGlobal;
  if (mswGlobal[installedKey]) return;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const request = toRequest(input, init);

    if (
      request &&
      currentMswScenarioMeta &&
      currentMswScenarioMeta.handlers.length > 0
    ) {
      const mockedResponse = await getResponse(
        currentMswScenarioMeta.handlers,
        request,
      );

      if (mockedResponse) return mockedResponse;
    }

    return originalFetch(input, init);
  };

  mswGlobal[installedKey] = true;
}

installFetchInterceptor();

function getMswScenario(env: Env): string | undefined {
  return (env as unknown as Record<string, string | undefined>)
    .HYDROGEN_E2E_MSW_SCENARIO;
}

function shouldInjectCustomerSession() {
  return (
    currentMswScenarioMeta &&
    currentMswScenarioMeta.mocksCustomerAccountApi &&
    currentMswScenarioMeta.handlers.length > 0
  );
}

function getTunnelRequestUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  url.protocol = 'https:';
  url.hostname = 'e2e.tryhydrogen.dev';
  url.port = '';
  return url.toString();
}

function withCookie(headers: Headers, cookiePair: string) {
  const cookiePairs = (headers.get('Cookie') ?? '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .filter((cookie) => !cookie.startsWith('session='));

  cookiePairs.push(cookiePair);
  headers.set('Cookie', cookiePairs.join('; '));
}

async function addMockCustomerSessionCookieIfNeeded(
  request: Request,
  env: Env,
) {
  if (!shouldInjectCustomerSession()) return request;

  const requestWithTunnelHostname = new Request(
    getTunnelRequestUrl(request.url),
    request,
  );

  const storage = createCookieSessionStorage({
    cookie: {
      name: 'session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets: [env.SESSION_SECRET],
    },
  });

  const session = await storage.getSession(
    requestWithTunnelHostname.headers.get('Cookie') ?? '',
  );

  const currentCustomerAccountSession =
    session.get('customerAccount') ??
    ({} as {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;
    });

  session.set('customerAccount', {
    ...currentCustomerAccountSession,
    accessToken:
      currentCustomerAccountSession.accessToken ?? 'e2e-customer-access-token',
    refreshToken:
      currentCustomerAccountSession.refreshToken ??
      'e2e-customer-refresh-token',
    expiresAt:
      currentCustomerAccountSession.expiresAt ??
      String(Date.now() + 60 * 60 * 1000),
  });

  const sessionCookiePair = (await storage.commitSession(session)).split(
    ';',
    1,
  )[0];
  const headers = new Headers(requestWithTunnelHostname.headers);
  withCookie(headers, sessionCookiePair);

  return new Request(requestWithTunnelHostname, {headers});
}

const appWithMsw = {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    currentMswScenarioMeta = getHandlersForScenario(getMswScenario(env));

    if (currentMswScenarioMeta?.mocksCustomerAccountApi) {
      process.env.HYDROGEN_E2E_CAAPI_MOCK = 'true';
    }

    const app = (await import('../../../templates/skeleton/server')).default;
    const requestWithSession = await addMockCustomerSessionCookieIfNeeded(
      request,
      env,
    );

    return app.fetch(requestWithSession, env, executionContext);
  },
};

export default appWithMsw;
