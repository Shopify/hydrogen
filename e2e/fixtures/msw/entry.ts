import {createCookieSessionStorage} from 'react-router';
import {MSW_SCENARIOS} from './scenarios';

/**
 * MSW’s cookie internals touch localStorage in this runtime path.
 * Without this, we hit: Failed to create a CookieStore: localStorage is not available.
 */
function ensureLocalStorage() {
  try {
    const key = '__hydrogen_e2e_local_storage_test__';

    globalThis.localStorage?.setItem(key, key);
    globalThis.localStorage?.removeItem(key);

    return;
  } catch {
    // Continue and install a safe localStorage polyfill below.
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

/**
 * MSW core imports WebSocket helpers that reference BroadcastChannel.
 * MiniOxygen/workerd doesn't provide it, so we install a no-op shim.
 */
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

/**
 * Worker-like runtimes may not expose a full Node `process` object.
 * MSW environment checks expect `process.versions.node` and `process.env`.
 */
function ensureNodeProcessForMsw() {
  const currentProcess = (globalThis as typeof globalThis & {process?: unknown})
    .process as
    | {
        versions?: {node?: string};
      }
    | undefined;

  if (currentProcess?.versions?.node) {
    try {
      (process.env as Record<string, string>).NODE_ENV = 'production';
    } catch {
      // Ignore if process.env is read-only in this runtime.
    }

    return;
  }

  const processShim: any = {
    env: {
      ...(typeof currentProcess === 'object' &&
      currentProcess &&
      'env' in currentProcess
        ? ((currentProcess as {env?: Record<string, string>}).env ?? {})
        : {}),
      NODE_ENV: 'production',
    },
    versions: {
      ...(currentProcess?.versions ?? {}),
      node: '22.0.0',
    },
  };

  try {
    Object.defineProperty(globalThis, 'process', {
      configurable: true,
      enumerable: false,
      value: processShim,
      writable: true,
    });
  } catch {
    (globalThis as any).process = processShim;
  }
}

ensureNodeProcessForMsw();

// Import MSW only after runtime shims are installed.
// Static import evaluates too early and can crash during module init.
const {getResponse} = await import('msw');
const {handlers} = await import('./handlers');

const mswScenario = process.env.HYDROGEN_E2E_MSW_SCENARIO;

const installedKey = Symbol.for('hydrogen.e2e.msw.installed');

type MswGlobal = typeof globalThis & {
  [installedKey]?: boolean;
};

const mswGlobal = globalThis as MswGlobal;

if (!mswGlobal[installedKey]) {
  const originalFetch = globalThis.fetch.bind(globalThis);

  // Intercept server-side fetch so MSW handlers can respond first.
  // Unhandled requests fall through to the original fetch.
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

function shouldInjectCustomerSession() {
  return (
    handlers.length > 0 &&
    (mswScenario === undefined ||
      mswScenario === MSW_SCENARIOS.customerAccountLoggedIn)
  );
}

/**
 * The /account route needs a customer session cookie in addition to GraphQL mocks.
 * We synthesize a session payload so route loaders treat the user as logged in.
 */
async function addMockCustomerSessionCookieIfNeeded(
  request: Request,
  env: Env,
) {
  if (!shouldInjectCustomerSession()) {
    return request;
  }

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

  const customerAccountSession =
    session.get('customerAccount') ??
    ({} as {
      accessToken?: string;
      expiresAt?: string;
      refreshToken?: string;
    });

  session.set('customerAccount', {
    ...customerAccountSession,
    accessToken:
      customerAccountSession.accessToken ?? 'e2e-customer-access-token',
    refreshToken:
      customerAccountSession.refreshToken ?? 'e2e-customer-refresh-token',
    expiresAt:
      customerAccountSession.expiresAt ?? String(Date.now() + 60 * 60 * 1000),
  });

  const setCookieHeader = await storage.commitSession(session);
  const sessionCookiePair = setCookieHeader.split(';', 1)[0];

  const headers = new Headers(requestWithTunnelHostname.headers);
  const existingCookies = headers.get('Cookie');
  const cookiePairs = existingCookies
    ? existingCookies
        .split(';')
        .map((cookie) => cookie.trim())
        .filter(Boolean)
        .filter((cookie) => !cookie.startsWith('session='))
    : [];

  cookiePairs.push(sessionCookiePair);
  headers.set('Cookie', cookiePairs.join('; '));

  return new Request(requestWithTunnelHostname, {headers});
}

function getTunnelRequestUrl(requestUrl: string) {
  // Customer account session cookie logic expects the tunneled HTTPS host.
  // Normalize local URL to match that shape before building the session.
  const url = new URL(requestUrl);
  url.protocol = 'https:';
  url.hostname = 'e2e.tryhydrogen.dev';
  url.port = '';

  return url.toString();
}

const appWithMsw = {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    // Dynamic import keeps this wrapper compatible with dev reload behavior.
    const app = (await import('../../../templates/skeleton/server')).default;

    const requestWithSession = await addMockCustomerSessionCookieIfNeeded(
      request,
      env,
    );

    return app.fetch(requestWithSession, env, executionContext);
  },
};

export default appWithMsw;
