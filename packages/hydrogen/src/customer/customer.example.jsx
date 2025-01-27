import {createCustomerAccountClient} from '@shopify/hydrogen';
import * as remixBuild from '@remix-run/dev/server-build';
import {
  createRequestHandler,
  createCookieSessionStorage,
} from '@shopify/remix-oxygen';

export default {
  async fetch(request, env, executionContext) {
    const session = await AppSession.init(request, [env.SESSION_SECRET]);

    /* Create a Customer API client with your credentials and options */
    const customerAccount = createCustomerAccountClient({
      /* Runtime utility in serverless environments */
      waitUntil: (p) => executionContext.waitUntil(p),
      /* Public Customer Account API token for your store */
      customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_ID,
      /* Shop Id */
      shopId: env.SHOP_ID,
      request,
      session,
    });

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      /* Inject the customer account client in the Remix context */
      getLoadContext: () => ({customerAccount}),
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
