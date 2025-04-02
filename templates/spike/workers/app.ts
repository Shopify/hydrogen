import type {SanityClient} from '@sanity/client';
import type {StorefrontApiClient} from '@shopify/storefront-api-client';
import {createStorefrontApiClient} from '@shopify/storefront-api-client';
import {createRequestHandler} from 'react-router';
import {createSanityClient} from '~/sanity/client';

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
    storefront: StorefrontApiClient;
    sanity: SanityClient;
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    // Shopify Storefront API Client
    const storefrontApiClient = createStorefrontApiClient({
      privateAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      apiVersion: '2025-01',
    });

    const sanityClient = createSanityClient(env);

    return requestHandler(request, {
      cloudflare: {env, ctx},
      storefront: storefrontApiClient,
      sanity: sanityClient,
    });
  },
} satisfies ExportedHandler<Env>;
