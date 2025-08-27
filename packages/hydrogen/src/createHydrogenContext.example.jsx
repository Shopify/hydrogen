import {createHydrogenContext} from '@shopify/hydrogen';
// @ts-expect-error
import * as reactRouterBuild from 'virtual:react-router/server-build';
import {createRequestHandler} from '@shopify/hydrogen/oxygen';
import {createCookieSessionStorage} from 'react-router';

export default {
  async fetch(request, env, executionContext) {
    const waitUntil = executionContext.waitUntil.bind(executionContext);
    const [cache, session] = await Promise.all([
      caches.open('hydrogen'),
      AppSession.init(request, [env.SESSION_SECRET]),
    ]);

    /* Create context objects required to use Hydrogen with your credentials and options */
    const hydrogenContext = createHydrogenContext({
      /* Environment variables from the fetch function */
      env,
      /* Request object from the fetch function */
      request,
      /* Cache API instance */
      cache,
      /* Runtime utility in serverless environments */
      waitUntil,
      session,
    });

    const handleRequest = createRequestHandler({
      build: reactRouterBuild,
      mode: process.env.NODE_ENV,
      /* Inject the customer account client in the Remix context */
      getLoadContext: () => ({...hydrogenContext}),
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
