// Virtual entry point for the app
const remixBuild = require("@remix-run/dev/server-build");

const { createStorefrontClient } = require("@shopify/hydrogen");

const {
  createRequestHandler,
  getBuyerIp,
  createCookieSessionStorage,
  SessionStorage,
  Session,
} = require("@shopify/remix-oxygen");

/**
 * A global `process` object is only available during build to access NODE_ENV.
 */

module.exports = {
  async fetch(request, env, executionContext) {
    try {
      /**
       * Open a cache instance in the worker and a custom session instance.
       */
      if (!env?.SESSION_SECRET) {
        throw new Error("SESSION_SECRET environment variable is not set");
      }

      const [cache, session] = await Promise.all([
        caches.open("hydrogen"),
        HydrogenSession.init(request, [env.SESSION_SECRET]),
      ]);

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        getLoadContext() {
          const waitUntil = executionContext.waitUntil.bind(executionContext);

          const { storefront } = createStorefrontClient({
            cache,
            waitUntil,
            buyerIp: getBuyerIp(request),
            i18n: { language: "EN", country: "US" },
            publicStorefrontToken: env.SHOPIFY_STOREFRONT_API_PUBLIC_TOKEN,
            storeDomain: env.SHOPIFY_STORE_DOMAIN,
            storefrontApiVersion:
              env.SHOPIFY_STOREFRONT_API_VERSION || "2022-10",
          });

          return {
            session,
            storefront,
            env,
          };
        },
      });

      return await handleRequest(request);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};

/**
 * This is a custom session implementation for your Hydrogen shop.
 * Feel free to customize it to your needs, add helper methods, or
 * swap out the cookie-based implementation with something else!
 */
class HydrogenSession {
  constructor(sessionStorage, session) {
    this.sessionStorage = sessionStorage;
    this.session = session;
  }

  static async init(request, secrets) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: "session",
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets,
      },
    });

    const session = await storage.getSession(request.headers.get("Cookie"));

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
    this.session.unset(key);
  }

  set(key, value) {
    this.session.set(key, value);
  }

  commit() {
    return this.sessionStorage.commitSession(this.session);
  }
}
