import {client} from './client.js';

export async function getServerSideProps() {
  const response = await fetch(client.getStorefrontApiUrl(), {
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
    }),
    // Generate the headers using the private token.
    headers: client.getPrivateTokenHeaders(),
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const json = await response.json();

  return {props: json};
}

const GRAPHQL_QUERY = `
  query {
    shop {
      name
    }
  }
`;
