import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { data } = await locals.storefrontClient.graphql(HEADER_COLLECTIONS_QUERY);
  return {
    headerCollections: normalizeHeaderCollections(data?.collections?.nodes),
  };
};
