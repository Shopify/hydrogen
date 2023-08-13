import {ApolloClient, InMemoryCache, gql} from '@apollo/client';

const APOLLO_HOST = 'http://localhost:4000/';

const client = new ApolloClient({
  uri: APOLLO_HOST,
  cache: new InMemoryCache(),
});

export const query = async (query: string, variables: any) => {
  return await client.query({
    query: gql`
      ${query}
    `,
    variables,
  });
};
