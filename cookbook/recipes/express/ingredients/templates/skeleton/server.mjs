import {createRequestHandler} from '@react-router/express';
import {createCookieSessionStorage} from 'react-router';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import {createHydrogenContext, InMemoryCache} from '@shopify/hydrogen';

// Don't capture process.env too early - it needs to be accessed after dotenv loads
const getEnv = () => process.env;

let vite;
if (process.env.NODE_ENV !== 'production') {
  const {createServer} = await import('vite');
  vite = await createServer({
    server: {
      middlewareMode: true,
    },
    configFile: 'vite.config.ts',
  });
}

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

// Create the request handler
app.all('*', async (req, res, next) => {
  // Create context with Express req object
  const context = await getContext(req);

  // Create handler with the context
  const handler = createRequestHandler({
    build: vite
      ? () => vite.ssrLoadModule('virtual:react-router/server-build')
      : await import('./build/server/index.js'),
    mode: process.env.NODE_ENV,
    getLoadContext: () => context,
  });

  return handler(req, res, next);
});

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
  const env = getEnv();
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
        queryFragment: CUSTOM_CART_QUERY,
      },
    },
    // Additional context can be added here
    {},
  );

  return hydrogenContext;
}

const CUSTOM_CART_QUERY = `#graphql
  fragment CartApiQuery on Cart {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                amount
                currencyCode
              }
              price {
                amount
                currencyCode
              }
              requiresShipping
              title
              image {
                id
                url
                altText
                width
                height
              }
              product {
                handle
                title
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalDutyAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
    }
  }

`;

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
