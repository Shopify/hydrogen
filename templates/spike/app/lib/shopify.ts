import {createStorefrontApiClient} from '@shopify/storefront-api-client';

declare global {
  interface CloudflareEnvironment extends Env {
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
  }
}

export function createClient(env: CloudflareEnvironment) {
  return createStorefrontApiClient({
    privateAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    apiVersion: '2025-01',
  });
}

export async function getShopDetails(env: CloudflareEnvironment) {
  const client = createClient(env);
  const {data} = await client.request(
    `
      query getShopDetails {
        shop {
          name
        }
      }
    `,
  );

  return data;
}
