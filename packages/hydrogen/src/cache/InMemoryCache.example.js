const {createRequestHandler} = require('@remix-run/express');
const path = require('path');
const {installGlobals} = require('@remix-run/node');
const express = require('express');
const {createStorefrontClient, InMemoryCache} = require('@shopify/hydrogen');

installGlobals();

const app = express();

const BUILD_DIR = path.join(process.cwd(), 'build');

app.use(
  '/build',
  express.static('public/build', {immutable: true, maxAge: '1y'}),
);

app.all('*', async (req) => {
  const {storefront} = createStorefrontClient({
    cache: new InMemoryCache(),
    // `waitUntil` is only needed on worker environments. For Express/Node, it isn't applicable
    waitUntil: null,
    i18n: {language: 'EN', country: 'US'},
    publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: process.env.PUBLIC_STORE_DOMAIN,
    storefrontId: process.env.PUBLIC_STOREFRONT_ID,
    storefrontHeaders: {
      cookie: req.get('cookie'),
    },
  });

  return createRequestHandler({
    build: require(BUILD_DIR),
    mode: process.env.NODE_ENV,
    getLoadContext: () => ({storefront}),
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
