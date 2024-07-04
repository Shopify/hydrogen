import { adminRequest } from './client.js';
import { parseGid } from '../../gid.js';

const LinkStorefrontQuery = `#graphql
  query LinkStorefront {
    hydrogenStorefronts {
      id
      title
      productionUrl
    }
  }
`;
async function getStorefronts(adminSession) {
  const { hydrogenStorefronts } = await adminRequest(
    LinkStorefrontQuery,
    adminSession
  );
  return hydrogenStorefronts.map((storefront) => ({
    ...storefront,
    parsedId: parseGid(storefront.id)
  }));
}

export { LinkStorefrontQuery, getStorefronts };
