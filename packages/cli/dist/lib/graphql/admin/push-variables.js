import { adminRequest } from './client.js';

const PushVariablesMutation = `#graphql
  mutation PushVariables(
    $storefrontId: ID!,
    $environmentId: ID!,
    $environmentVariablesInput: [HydrogenStorefrontEnvironmentVariableInput!]!,
  ) {
    hydrogenStorefrontEnvironmentVariableBulkReplace(
      storefrontId: $storefrontId,
      environmentId: $environmentId,
      environmentVariablesInput: $environmentVariablesInput,
    ) {
      userErrors {
        code
        message
      }
    }
  }
`;
async function pushStorefrontEnvVariables(adminSession, storefrontId, environmentId, variables) {
  const { hydrogenStorefrontEnvironmentVariableBulkReplace } = await adminRequest(
    PushVariablesMutation,
    adminSession,
    {
      storefrontId,
      environmentId,
      environmentVariablesInput: variables
    }
  );
  const { userErrors } = hydrogenStorefrontEnvironmentVariableBulkReplace;
  return { userErrors };
}

export { pushStorefrontEnvVariables };
