import { adminRequest } from './client.js';

const GetDeploymentDataQuery = `#graphql
  query GetDeploymentToken($id: ID!) {
    hydrogenStorefront(id: $id) {
      oxygenDeploymentToken
      environments {
        name
        handle
        branch
        type
      }
    }
  }
`;
async function getOxygenData(adminSession, storefrontId) {
  const { hydrogenStorefront } = await adminRequest(
    GetDeploymentDataQuery,
    adminSession,
    {
      id: storefrontId
    }
  );
  return { storefront: hydrogenStorefront };
}

export { GetDeploymentDataQuery, getOxygenData };
