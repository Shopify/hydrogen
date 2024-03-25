import {type HydrogenStorefront} from './list-environments.js';

export function dummyListEnvironments(
  storefrontId: string,
): HydrogenStorefront {
  return {
    id: storefrontId,
    productionUrl: 'https://my-shop.myshopify.com',
    environments: [
      {
        id: 'gid://shopify/HydrogenStorefrontEnvironment/1',
        branch: 'main',
        type: 'PRODUCTION',
        name: 'Production',
        handle: 'production',
        createdAt: '2023-02-16T22:35:42Z',
        url: 'https://oxygen-123.example.com',
      },
      {
        id: 'gid://shopify/HydrogenStorefrontEnvironment/2',
        branch: null,
        type: 'PREVIEW',
        name: 'Preview',
        handle: 'preview',
        createdAt: '2023-02-16T22:35:42Z',
        url: null,
      },
      {
        id: 'gid://shopify/HydrogenStorefrontEnvironment/3',
        branch: 'staging',
        type: 'CUSTOM',
        name: 'Staging',
        handle: 'staging',
        createdAt: '2023-05-08T20:52:29Z',
        url: 'https://oxygen-456.example.com',
      },
    ],
  };
}
