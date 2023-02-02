import {createStorefrontClient} from '@shopify/hydrogen-react';

export const shopClient = createStorefrontClient({
  storeDomain: 'https://hydrogen-preview.myshopify.com',
  // TODO: convert to 'privateStorefrontToken'!
  publicStorefrontToken: '3b580e70970c4528da70c98e097c2fa0',
  storefrontApiVersion: '2023-01',
});
