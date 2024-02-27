import {adminRequest, type AdminSession} from './client.js';

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
        type
        url
      }
    }
  }
`;

type EnvironmentType = 'PREVIEW' | 'PRODUCTION' | 'CUSTOM';

export interface Environment {
  branch: string | null;
  createdAt: string;
  id: string;
  name: string;
  type: EnvironmentType;
  url: string | null;
}

interface HydrogenStorefront {
  id: string;
  environments: Environment[];
  productionUrl: string;
}

export interface ListEnvironmentsSchema {
  hydrogenStorefront: HydrogenStorefront | null;
}

export async function getStorefrontEnvironments(
  adminSession: AdminSession,
  storefrontId: string,
) {
  const {hydrogenStorefront} = await adminRequest<ListEnvironmentsSchema>(
    ListEnvironmentsQuery,
    adminSession,
    {id: storefrontId},
  );

  return hydrogenStorefront;
}
