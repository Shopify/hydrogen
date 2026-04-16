// POC: Using hydrogen-api's full createStorefrontClient.
// Demonstrates the complete storefront client with caching, i18n,
// typed GraphQL queries, and error handling — no Hydrogen framework
// helpers needed. This file is disposable and will be removed after evaluation.
import {
  createStorefrontClient,
  getStorefrontHeaders,
  SFAPI_VERSION,
} from '@shopify/hydrogen-api';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/api-poc';

const SHOP_QUERY = `#graphql
  query ShopName {
    shop {
      name
      description
    }
  }
` as const;

export async function loader({request, context}: Route.LoaderArgs) {
  const {env} = context;

  // Full storefront client with typed queries, error handling, and i18n.
  // Without a `cache` instance, responses are not cached — suitable for
  // serverless environments or when you bring your own caching layer.
  const {storefront} = createStorefrontClient({
    storeDomain: env.PUBLIC_STORE_DOMAIN || 'mock.shop',
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    cache: new Cache(),
    storefrontApiVersion: SFAPI_VERSION,
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    storefrontHeaders: getStorefrontHeaders(request),
    i18n: {language: 'EN', country: 'US'} as const,
  });

  const data = await storefront.query(SHOP_QUERY);

  return {
    apiVersion: SFAPI_VERSION,
    shop: data.shop,
  };
}

export default function ApiPocRoute() {
  const {apiVersion, shop} = useLoaderData<typeof loader>();

  return (
    <div style={{padding: '2rem', fontFamily: 'monospace'}}>
      <h1>hydrogen-api POC</h1>
      <p>Storefront API version: {apiVersion}</p>

      {shop && (
        <dl>
          <dt>Shop name</dt>
          <dd>{shop.name}</dd>
          <dt>Description</dt>
          <dd>{shop.description || '(none)'}</dd>
        </dl>
      )}
    </div>
  );
}
