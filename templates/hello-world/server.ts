// Virtual entry point for the app
import * as remixBuild from '@remix-run/dev/server-build';
import {createRequestHandler} from '@shopify/hydrogen-remix';

declare const process: {env: {NODE_ENV: string}};

const requestHandler = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
  shouldProxyAsset: () => false,
  shouldProxyOnlineStore: (request: Request) =>
    new URL(request.url).pathname === '/proxy' ? '/pages/about' : null,
});

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response> {
    if (!env?.SESSION_SECRET) {
      // eslint-disable-next-line no-console
      console.error('SESSION_SECRET environment variable is not set');
      return new Response('Internal Server Error', {status: 500});
    }

    const session = await HydrogenSession.init(request, [env.SESSION_SECRET]);

    try {
      return await requestHandler(
        request,
        {
          env,
          context,
          storefront: {
            publicStorefrontToken: env.SHOPIFY_STOREFRONT_API_PUBLIC_TOKEN,
            storeDomain: env.SHOPIFY_STORE_DOMAIN,
            storefrontApiVersion: '2022-10',
            i18n: {language: 'EN', country: 'US'},
          },
        },
        {
          session,
        },
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};

import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from '@shopify/hydrogen-remix';

/**
 * This is a custom session implementation for your Hydrogen shop.
 * Feel free to customize it to your needs, add helper methods, or
 * swap out the cookie-based implementation with something else!
 */
export class HydrogenSession {
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
    this.session.unset(key);
  }

  set(key: string, value: any) {
    this.session.set(key, value);
  }

  commit() {
    return this.sessionStorage.commitSession(this.session);
  }
}
