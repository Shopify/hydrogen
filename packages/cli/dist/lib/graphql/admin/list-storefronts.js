import { adminRequest } from './client.js';
import { parseGid } from '../../gid.js';

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
async function getStorefrontsWithDeployment(adminSession) {
  const { hydrogenStorefronts } = await adminRequest(
    ListStorefrontsQuery,
    adminSession
  );
  return hydrogenStorefronts.map((storefront) => ({
    ...storefront,
    parsedId: parseGid(storefront.id)
  }));
}

export { getStorefrontsWithDeployment };
