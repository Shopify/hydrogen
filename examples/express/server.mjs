import {createRequestHandler} from '@react-router/express';
import {createCookieSessionStorage} from 'react-router';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import {createHydrogenContext, InMemoryCache} from '@shopify/hydrogen';

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
            ? () => vite.ssrLoadModule('virtual:react-router/server-build')
            : await import('./build/server/index.js'),
          mode: process.env.NODE_ENV,
          getLoadContext: () => context,
        })(req, res, next);
      }
    : async (req) => {
        const context = await getContext(req);

        return createRequestHandler({
          build: vite
            ? () => vite.ssrLoadModule('virtual:react-router/server-build')
            : await import('./build/server/index.js'),
          mode: process.env.NODE_ENV,
          getLoadContext: () => context,
        });
      },
);
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const newPort = parseInt(port) + 1;
    console.log(`Port ${port} is in use, trying ${newPort}...`);
    server.listen(newPort);
  } else {
    throw err;
  }
});

async function getContext(req) {
  const session = await AppSession.init(req, [env.SESSION_SECRET]);

  // Create a minimal Request object for Node.js
  const request = new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers: req.headers,
  });

  // Create Hydrogen context similar to skeleton, adapted for Node.js
  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache: new InMemoryCache(),
      waitUntil: null, // Not applicable in Node.js
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        // Add a customt cart fragment if needed
        queryFragment: `
          fragment CartApiQuery on Cart {
            id
            totalQuantity
          }
        `,
      },
    },
    // Additional context can be added here
    {},
  );

  return hydrogenContext;
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
