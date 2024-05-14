/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * server.js
 * ---------
 * Create a storefront client.
 * Check the server.js file in the root of your new Hydrogen project to see
 * an example implementation of this function. If you start from an official
 * Hydrogen template (Hello World or Demo Store), then the client is already
 * set up for you. Update the Shopify store domain and API token to start
 * querying your own store inventory.
 */
const {storefront} = createStorefrontClient({
  cache,
  waitUntil,
  i18n: {language: 'EN', country: 'US'},
  // `env` provides access to runtime data, including environment variables
  publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
  privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
  storeDomain: env.PUBLIC_STORE_DOMAIN,
  storefrontId: env.PUBLIC_STOREFRONT_ID,
  storefrontHeaders: getStorefrontHeaders(request),
});
