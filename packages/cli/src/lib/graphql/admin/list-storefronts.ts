import {adminRequest, parseGid} from '../../graphql.js';
import {getAdminSession} from '../../admin-session.js';

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

interface HydrogenStorefront {
  id: string;
  title: string;
  productionUrl?: string;
  currentProductionDeployment: Deployment | null;
}

interface ListStorefrontsSchema {
  hydrogenStorefronts: HydrogenStorefront[];
}

export async function getStorefrontsWithDeployment(shop: string) {
  const adminSession = await getAdminSession(shop);

  const {hydrogenStorefronts} = await adminRequest<ListStorefrontsSchema>(
    ListStorefrontsQuery,
    adminSession,
  );

  return {
    adminSession,
    storefronts: hydrogenStorefronts.map((storefront) => ({
      ...storefront,
      parsedId: parseGid(storefront.id),
    })),
  };
}
