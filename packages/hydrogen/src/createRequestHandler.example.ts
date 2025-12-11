import {
  createHydrogenContext,
  createRequestHandler,
  type HydrogenSession,
} from '@shopify/hydrogen';
import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from 'react-router';
import * as reactRouterBuild from 'virtual:react-router/server-build';

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const waitUntil = executionContext.waitUntil.bind(executionContext);
    const [cache, session] = await Promise.all([
      caches.open('hydrogen'),
      AppSession.init(request, [env.SESSION_SECRET]),
    ]);

    /* Create context objects required to use Hydrogen with your credentials and options */
    const hydrogenContext = createHydrogenContext({
      env,
      request,
      cache,
      waitUntil,
      session,
    });

    /**
     * Create a request handler with Hydrogen utilities.
     * This handler automatically proxies Storefront API requests
     * and collects tracking information for analytics.
     */
    const handleRequest = createRequestHandler({
      build: reactRouterBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    const response = await handleRequest(request);

    if (session.isPending) {
      response.headers.set('Set-Cookie', await session.commit());
    }

    return response;
  },
};

class AppSession implements HydrogenSession {
  public isPending = false;

  constructor(
    private sessionStorage: SessionStorage,
    private session: Session,
  ) {}

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });

    const session = await storage.getSession(request.headers.get('Cookie'));

    return new this(storage, session);
  }

  get(key: string) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  flash(key: string, value: any) {
    this.session.flash(key, value);
  }

  unset(key: string) {
    this.isPending = true;
    this.session.unset(key);
  }

  set(key: string, value: any) {
    this.isPending = true;
    this.session.set(key, value);
  }

  commit() {
    this.isPending = false;
    return this.sessionStorage.commitSession(this.session);
  }
}
