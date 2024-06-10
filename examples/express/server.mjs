import {createRequestHandler} from '@remix-run/express';
import {installGlobals, createCookieSessionStorage} from '@remix-run/node';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import {createStorefrontClient, InMemoryCache} from '@shopify/hydrogen';
import crypto from 'node:crypto';

installGlobals();

const env = process.env;

const vite =
  process.env.NODE_ENV === 'production'
    ? undefined
    : await import('vite').then(({createServer}) =>
        createServer({
          server: {
            middlewareMode: true,
          },
        }),
      );

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// handle asset requests
if (vite) {
  app.use(vite.middlewares);
} else {
  // add morgan here for production only
  // dev uses morgan plugin, otherwise it spams the console with HMR requests
  app.use(morgan('tiny'));
  app.use(
    '/assets',
    express.static('build/client/assets', {immutable: true, maxAge: '1y'}),
  );
}
app.use(express.static('build/client', {maxAge: '1h'}));

app.all(
  '*',
  process.env.NODE_ENV === 'development'
    ? async (req, res, next) => {
        const context = await getContext(req);

        return createRequestHandler({
          build: vite
            ? () => vite.ssrLoadModule('virtual:remix/server-build')
            : await import('./build/server/index.js'),
          mode: process.env.NODE_ENV,
          getLoadContext: () => context,
        })(req, res, next);
      }
    : async (req) => {
        const context = await getContext(req);

        return createRequestHandler({
          build: vite
            ? () => vite.ssrLoadModule('virtual:remix/server-build')
            : await import('./build/server/index.js'),
          mode: process.env.NODE_ENV,
          getLoadContext: () => context,
        });
      },
);
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

async function getContext(req) {
  const session = await AppSession.init(req, [env.SESSION_SECRET]);

  const {storefront} = createStorefrontClient({
    // A [`cache` instance](https://developer.mozilla.org/en-US/docs/Web/API/Cache) is necessary for sub-request caching to work.
    // We provide only an in-memory implementation
    cache: new InMemoryCache(),
    // `waitUntil` is only needed on worker environments. For Express/Node, it isn't applicable
    waitUntil: null,
    i18n: {language: 'EN', country: 'US'},
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    storefrontHeaders: {
      requestGroupId: crypto.randomUUID(),
      buyerIp: (req.headers['x-forwarded-for'] || req.connection.remoteAddress)
        .split(':')
        .pop(),
      cookie: req.get('cookie'),
    },
  });

  return {session, storefront, env};
}

class AppSession {
  constructor(sessionStorage, session) {
    this.sessionStorage = sessionStorage;
    this.session = session;
  }

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

    const session = await storage
      .getSession(request.get('Cookie'))
      .catch(() => storage.getSession());

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
