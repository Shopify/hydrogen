import { loadCollections } from "../../lib/loaders";
import { setRouteData } from "../../lib/storefront";

export const GET = (async (context, next) => {
  setRouteData(context, await loadCollections(context), "Collections — Mock.shop");
  return next();
}) satisfies MarkoRun.GET;
