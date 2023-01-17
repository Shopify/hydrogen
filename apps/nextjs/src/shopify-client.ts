import {createStorefrontClient} from '@shopify/storefront-kit-react';

export const shopClient = createStorefrontClient({
  storeDomain: 'hydrogen-preview',
  // TODO: convert to 'privateStorefrontToken'!
  publicStorefrontToken: '3b580e70970c4528da70c98e097c2fa0',
  storefrontApiVersion: '2023-01',
});
