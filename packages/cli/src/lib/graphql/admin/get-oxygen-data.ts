import {type AdminSession, adminRequest} from './client.js';

export const GetDeploymentDataQuery = `#graphql
  query GetDeploymentToken($id: ID!) {
    hydrogenStorefront(id: $id) {
      oxygenDeploymentToken
      environments {
        name
        branch
        type
      }
    }
  }
`;

export interface OxygenDeploymentData {
  oxygenDeploymentToken: string;
  environments: Array<{
    name: string;
    branch: string | null;
    type: 'PREVIEW' | 'CUSTOM' | 'PRODUCTION';
  }> | null;
}

export interface GetDeploymentDataSchema {
  hydrogenStorefront: OxygenDeploymentData | null;
}

export async function getOxygenData(
  adminSession: AdminSession,
  storefrontId: string,
): Promise<{storefront: OxygenDeploymentData | null}> {
  const {hydrogenStorefront} = await adminRequest<GetDeploymentDataSchema>(
    GetDeploymentDataQuery,
    adminSession,
    {
      id: storefrontId,
    },
  );

  return {storefront: hydrogenStorefront};
}
