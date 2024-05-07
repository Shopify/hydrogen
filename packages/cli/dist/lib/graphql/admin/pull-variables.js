import { adminRequest } from './client.js';

const PullVariablesQuery = `#graphql
  query PullVariables($id: ID!, $handle: String) {
    hydrogenStorefront(id: $id) {
      id
      environmentVariables(handle: $handle) {
        id
        isSecret
        readOnly
        key
        value
      }
    }
  }
`;
async function getStorefrontEnvVariables(adminSession, storefrontId, envHandle) {
  const { hydrogenStorefront } = await adminRequest(
    PullVariablesQuery,
    adminSession,
    {
      id: storefrontId,
      handle: envHandle
    }
  );
  return hydrogenStorefront;
}

export { getStorefrontEnvVariables };
