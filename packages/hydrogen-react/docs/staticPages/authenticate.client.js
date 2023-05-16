import {createStorefrontClient} from '@shopify/hydrogen-react';

export const client = createStorefrontClient({
  // load environment variables according to your framework and runtime
  storeDomain: process.env.PUBLIC_STORE_DOMAIN,
  storefrontApiVersion: process.env.PUBLIC_STOREFRONT_API_VERSION,
  publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN,
});
