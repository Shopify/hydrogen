import {adminRequest, type AdminSession} from './client.js';

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

export interface HydrogenStorefrontEnvironmentVariableInput {
  key: string;
  value?: string;
}

export interface UserErrors {
  code: string;
  field: string[];
  message: string;
}

export interface PushVariablesSchema {
  hydrogenStorefrontEnvironmentVariableBulkReplace: {
    userErrors: UserErrors[];
  };
}

export async function pushStorefrontEnvVariables(
  adminSession: AdminSession,
  storefrontId: string,
  environmentId: string,
  variables: HydrogenStorefrontEnvironmentVariableInput[],
) {
  const {hydrogenStorefrontEnvironmentVariableBulkReplace} =
    await adminRequest<PushVariablesSchema>(
      PushVariablesMutation,
      adminSession,
      {
        storefrontId,
        environmentId,
        environmentVariablesInput: variables,
      },
    );

  const {userErrors} = hydrogenStorefrontEnvironmentVariableBulkReplace;

  return {userErrors};
}
