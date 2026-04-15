// POC: Using hydrogen-api's createStorefrontClient directly.
// Demonstrates querying the Storefront API with the low-level client —
// no Hydrogen framework helpers, no caching, just raw fetch with typed headers.
// This file is disposable and will be removed after evaluation.
import {createStorefrontClient, SFAPI_VERSION} from '@shopify/hydrogen-api';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/api-poc';

const SHOP_QUERY = `#graphql
  query ShopName {
    shop {
      name
      description
    }
  }
`;

export async function loader({context}: Route.LoaderArgs) {
  const {env} = context;

  const client = createStorefrontClient({
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
  });

  const response = await fetch(client.getStorefrontApiUrl(), {
    method: 'POST',
    headers: client.getPublicTokenHeaders(),
    body: JSON.stringify({query: SHOP_QUERY}),
  });

  const {data, errors} = (await response.json()) as {
    data?: {shop: {name: string; description: string}};
    errors?: unknown[];
  };

  return {
    apiVersion: SFAPI_VERSION,
    shop: data?.shop ?? null,
    errors: errors ?? null,
  };
}

export default function ApiPocRoute() {
  const {apiVersion, shop, errors} = useLoaderData<typeof loader>();

  return (
    <div style={{padding: '2rem', fontFamily: 'monospace'}}>
      <h1>hydrogen-api POC</h1>
      <p>Storefront API version: {apiVersion}</p>

      {errors && (
        <pre style={{color: 'red'}}>{JSON.stringify(errors, null, 2)}</pre>
      )}

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
