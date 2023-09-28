import {type AdminSession, adminRequest} from './client.js';

export const GetDeploymentDataQuery = `#graphql
  query GetDeploymentToken($id: ID!) {
    hydrogenStorefront(id: $id) {
      oxygenDeploymentToken
      environments {
        name
        branch
      }
    }
  }
`;

export interface HydrogenStorefront {
  deploymentToken: string;
  environments: Array<{
    name: string;
    branch: string;
  }> | null;
}

export interface GetDeploymentDataSchema {
  storefront: HydrogenStorefront | null;
}

export async function getOxygenData(
  adminSession: AdminSession,
  storefrontId: string,
): Promise<{storefront: HydrogenStorefront | null}> {
  const {storefront} = await adminRequest<GetDeploymentDataSchema>(
    GetDeploymentDataQuery,
    adminSession,
    {
      id: storefrontId,
    },
  );

  return {storefront: storefront};
}
