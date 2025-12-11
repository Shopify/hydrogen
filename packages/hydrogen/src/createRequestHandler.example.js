import {createHydrogenContext, createRequestHandler} from '@shopify/hydrogen';
import {createCookieSessionStorage} from 'react-router';
import * as reactRouterBuild from 'virtual:react-router/server-build';

export default {
  async fetch(request, env, executionContext) {
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

class AppSession {
  isPending = false;

  static async init(request, secrets) {
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

  get(key) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  flash(key, value) {
    this.session.flash(key, value);
  }

  unset(key) {
    this.isPending = true;
    this.session.unset(key);
  }

  set(key, value) {
    this.isPending = true;
    this.session.set(key, value);
  }

  commit() {
    this.isPending = false;
    return this.sessionStorage.commitSession(this.session);
  }
}
