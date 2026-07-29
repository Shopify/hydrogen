import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const { data } = await storefrontClient.graphql(HEADER_COLLECTIONS_QUERY);
  return normalizeHeaderCollections(data?.collections?.nodes);
});
