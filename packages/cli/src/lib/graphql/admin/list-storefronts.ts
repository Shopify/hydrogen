import {adminRequest, type AdminSession} from './client.js';
import {parseGid} from '../../gid.js';

const ListStorefrontsQuery = `#graphql
  query ListStorefronts {
    hydrogenStorefronts {
      id
      title
      productionUrl
      currentProductionDeployment {
        id
        createdAt
        commitMessage
      }
    }
  }
`;

export interface Deployment {
  id: string;
  createdAt: string;
  commitMessage: string | null;
}

export interface HydrogenStorefront {
  id: string;
  title: string;
  productionUrl?: string;
  currentProductionDeployment: Deployment | null;
}

export interface ListStorefrontsSchema {
  hydrogenStorefronts: HydrogenStorefront[];
}

export async function getStorefrontsWithDeployment(adminSession: AdminSession) {
  const {hydrogenStorefronts} = await adminRequest<ListStorefrontsSchema>(
    ListStorefrontsQuery,
    adminSession,
  );

  return hydrogenStorefronts.map((storefront) => ({
    ...storefront,
    parsedId: parseGid(storefront.id),
  }));
}
