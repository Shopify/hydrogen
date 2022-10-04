import { createStorefrontClient } from "@shopify/hydrogen-ui-alpha";

const client = createStorefrontClient({
  // publicStorefrontToken: "3b580e70970c4528da70c98e097c2fa0",
  // storeDomain: "hydrogen-preview",
  publicStorefrontToken: "2ea884cea86d1d8042d05e316127908b",
  storeDomain: "hydrogen-lab",
  storefrontApiVersion: "2022-07",
});

export const getStorefrontApiUrl = client.getStorefrontApiUrl;
export const getPrivateTokenHeaders = client.getPrivateTokenHeaders;
export const getPublicTokenHeaders = client.getPublicTokenHeaders;
