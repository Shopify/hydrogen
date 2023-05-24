import {adminRequest, parseGid} from '../../graphql.js';
import {getAdminSession} from '../../admin-session.js';

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

interface LinkStorefrontSchema {
  hydrogenStorefronts: HydrogenStorefront[];
}

export async function getStorefronts(shop: string) {
  const adminSession = await getAdminSession(shop);

  const {hydrogenStorefronts} = await adminRequest<LinkStorefrontSchema>(
    LinkStorefrontQuery,
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
