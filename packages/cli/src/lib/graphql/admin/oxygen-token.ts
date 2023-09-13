import {type AdminSession, adminRequest} from './client.js';

export const GetDeploymentTokenQuery = `#graphql
  query GetDeploymentToken($id: ID!) {
    hydrogenStorefront(id: $id) {
      oxygenDeploymentToken
    }
  }
`;

interface HydrogenStorefront {
  oxygenDeploymentToken: string;
}

export interface GetDeploymentTokenSchema {
  hydrogenStorefront: HydrogenStorefront | null;
}

export async function getOxygenToken(
  adminSession: AdminSession,
  storefrontId: string,
) {
  const {hydrogenStorefront} = await adminRequest<GetDeploymentTokenSchema>(
    GetDeploymentTokenQuery,
    adminSession,
    {
      id: storefrontId,
    },
  );

  return {storefront: hydrogenStorefront};
}
