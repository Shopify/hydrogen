import {adminRequest, type AdminSession} from './client.js';
import {parseGid} from '../../gid.js';

export const LinkStorefrontQuery = `#graphql
  query LinkStorefront {
    hydrogenStorefronts {
      id
      title
      productionUrl
    }
  }
`;

interface HydrogenStorefront {
  id: string;
  title: string;
  productionUrl: string;
}

export interface LinkStorefrontSchema {
  hydrogenStorefronts: HydrogenStorefront[];
}

export async function getStorefronts(adminSession: AdminSession) {
  const {hydrogenStorefronts} = await adminRequest<LinkStorefrontSchema>(
    LinkStorefrontQuery,
    adminSession,
  );

  return hydrogenStorefronts.map((storefront) => ({
    ...storefront,
    parsedId: parseGid(storefront.id),
  }));
}
