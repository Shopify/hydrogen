import {createCookieSessionStorage} from 'react-router';
import {MswScenarioMeta} from './handlers';

const installedKey = Symbol.for('hydrogen.e2e.msw.installed');
const LOCAL_STORAGE_TEST_KEY = '__hydrogen_e2e_local_storage_test__';

// Cookie-based session storage derives cookie attributes from the request URL.
// localhost wouldn't produce cookies valid for the CAAPI auth flow, so we
// rewrite requests to a tunnel hostname that matches the expected cookie domain.
const E2E_TUNNEL_HOSTNAME = 'e2e.tryhydrogen.dev';

const SESSION_TTL_IN_MS = 60 * 60 * 1000;

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
  if (globalThis.localStorage == null) return false;

  try {
    globalThis.localStorage.setItem(LOCAL_STORAGE_TEST_KEY, '1');
    globalThis.localStorage.removeItem(LOCAL_STORAGE_TEST_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * MSW stores handler state in localStorage. Workerd doesn't provide
 * localStorage, so we polyfill it with an in-memory Map. Without this,
 * MSW's `getResponse` silently fails to match registered handlers.
 */
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

/**
 * MSW uses BroadcastChannel internally for coordination between its
 * service-worker and client runtimes. Workerd doesn't provide it, so we
 * supply a no-op implementation to prevent runtime errors during MSW init.
 */
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

/**
 * MSW needs `process.versions.node` set so it uses its Node.js programmatic
 * interception strategy (not Service Worker). `NODE_ENV: 'production'`
 * suppresses MSW's verbose dev-mode diagnostics that pollute test logs.
 */
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

// The fetch interceptor is installed once as a closure and cannot receive
// parameters per-request. Module-level state is the only way to communicate
// the current scenario to the interceptor. Safe because workerd is single-threaded.
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
  return env.HYDROGEN_E2E_MSW_SCENARIO;
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
  url.hostname = E2E_TUNNEL_HOSTNAME;
  url.port = '';
  return url.toString();
}

function withCookie(headers: Headers, cookiePair: string) {
  // Strip any existing session cookie before appending the mock one
  const cookiePairs = (headers.get('Cookie') ?? '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .filter((cookie) => !cookie.startsWith('session='));

  cookiePairs.push(cookiePair);
  headers.set('Cookie', cookiePairs.join('; '));
}

let cachedSessionStorage: ReturnType<typeof createCookieSessionStorage>;
let cachedSessionSecret: string;

function getSessionStorage(secret: string) {
  if (cachedSessionStorage && cachedSessionSecret === secret) {
    return cachedSessionStorage;
  }

  cachedSessionSecret = secret;
  cachedSessionStorage = createCookieSessionStorage({
    cookie: {
      name: 'session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets: [secret],
    },
  });

  return cachedSessionStorage;
}

async function addMockCustomerSessionCookieIfNeeded(
  request: Request,
  env: Env,
) {
  if (!shouldInjectCustomerSession()) return request;

  // Clone so the original body isn't consumed — `new Request(url, init)`
  // exhausts the init request's body per the Fetch spec.
  const requestWithTunnelHostname = new Request(
    getTunnelRequestUrl(request.url),
    request.clone(),
  );

  const storage = getSessionStorage(env.SESSION_SECRET);

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
      String(Date.now() + SESSION_TTL_IN_MS),
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

    const app = (await import('../../../templates/skeleton/server')).default;
    const requestWithSession = await addMockCustomerSessionCookieIfNeeded(
      request,
      env,
    );

    return app.fetch(requestWithSession, env, executionContext);
  },
};

export default appWithMsw;
