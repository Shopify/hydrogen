import {createStorefrontClient} from '@shopify/hydrogen-react';

export const client = createStorefrontClient({
  storeDomain: 'https://{store-name}.myshopify.com',
  storefrontApiVersion: '2025-07',
  privateStorefrontToken: '{private token for server-side requests}',
});

// in another file where you need to make queries, for example in NextJS server-side:

// a Storefront API query
const GRAPHQL_QUERY = `
  query {
    shop {
      name
    }
  }
`;

// make the request
export async function getServerSideProps() {
  // Get the Storefront API url
  const response = await fetch(client.getStorefrontApiUrl(), {
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
    }),
    // Generate the headers using the private token. Additionally, you can pass in the buyer's IP address from the request object to help prevent bad actors from overloading your store.
    headers: client.getPrivateTokenHeaders({buyerIp: '...'}),
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const json = await response.json();

  return {props: json};
}
