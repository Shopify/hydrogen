import {type AdminSession} from '../../admin-session.js';
import {adminRequest} from '../../graphql.js';

export const PullVariablesQuery = `#graphql
  query PullVariables($id: ID!, $branch: String) {
    hydrogenStorefront(id: $id) {
      id
      environmentVariables(branchName: $branch) {
        id
        isSecret
        key
        value
      }
    }
  }
`;

export interface EnvironmentVariable {
  id: string;
  isSecret: boolean;
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
  envBranch?: string,
) {
  const {hydrogenStorefront} = await adminRequest<PullVariablesSchema>(
    PullVariablesQuery,
    adminSession,
    {
      id: storefrontId,
      branch: envBranch,
    },
  );

  return {storefront: hydrogenStorefront};
}
