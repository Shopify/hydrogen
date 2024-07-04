import { adminRequest } from './client.js';

const ListEnvironmentsQuery = `#graphql
  query ListStorefronts($id: ID!) {
    hydrogenStorefront(id: $id) {
      id
      productionUrl
      environments {
        branch
        createdAt
        id
        name
        handle
        type
        url
      }
    }
  }
`;
async function getStorefrontEnvironments(adminSession, storefrontId) {
  const { hydrogenStorefront } = await adminRequest(
    ListEnvironmentsQuery,
    adminSession,
    { id: storefrontId }
  );
  return hydrogenStorefront;
}

export { getStorefrontEnvironments };
