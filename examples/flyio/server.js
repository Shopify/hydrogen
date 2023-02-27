// Virtual entry point for the app
const path = require('path');
const express = require('express');
const {createRequestHandler} = require('@remix-run/express');
const {createStorefrontClient} = require('@shopify/hydrogen');

const app = express();
const BUILD_DIR = path.join(process.cwd(), 'build');

const env = {
  PUBLIC_STOREFRONT_API_TOKEN: process.env.PUBLIC_STOREFRONT_API_TOKEN,
  PUBLIC_STOREFRONT_DOMAIN: process.env.PUBLIC_STOREFRONT_DOMAIN,
  PRIVATE_STOREFRONT_API_TOKEN: process.env.PRIVATE_STOREFRONT_API_TOKEN,
  SESSION_SECRET: process.env.SESSION_SECRET,
  PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN,
};

const port =
  process.env.PORT || (process.env.NODE_ENV === 'development' ? 3000 : 8080);

// Remix fingerprints its assets so we can cache forever.
app.use(
  '/build',
  express.static('public/build', {immutable: true, maxAge: '1y'}),
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('public', {maxAge: '1h'}));

app.all('*', (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    purgeRequireCache();
  }
  /**
   * Create Hydrogen's Storefront client.
   */
  const {storefront} = createStorefrontClient({
    buyerIp: req.get('oxygen-buyer-ip') ?? undefined,
    i18n: {language: 'EN', country: 'US'},
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
    storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-01',
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    requestGroupId: req.get('request-id') ?? undefined,
  });

  /**
   * Create a Remix request handler and pass
   * Hydrogen's Storefront client to the loader context.
   */
  return createRequestHandler({
    build: require(BUILD_DIR),
    mode: process.env.NODE_ENV,
    getLoadContext: () => ({storefront, env}),
  })(req, res, next);
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, but then you'll have to reconnect to databases/etc on each
  // change. We prefer the DX of this, so we've included it for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}
