import {adminRequest, type AdminSession} from './client.js';

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

export interface EnvironmentVariable {
  id: string;
  isSecret: boolean;
  readOnly: boolean;
  key: string;
  value: string;
}

interface HydrogenStorefront {
  id: string;
  environmentVariables: EnvironmentVariable[];
}

export interface PullVariablesSchema {
  hydrogenStorefront: HydrogenStorefront | null;
}

export async function getStorefrontEnvVariables(
  adminSession: AdminSession,
  storefrontId: string,
  envHandle?: string,
) {
  const {hydrogenStorefront} = await adminRequest<PullVariablesSchema>(
    PullVariablesQuery,
    adminSession,
    {
      id: storefrontId,
      handle: envHandle,
    },
  );

  return hydrogenStorefront;
}
