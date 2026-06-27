import { loadCollection } from "../../../lib/loaders";
import { setRouteData } from "../../../lib/storefront";

export const GET = (async (context, next) => {
  const data = await loadCollection(context);
  setRouteData(context, data, `${data.collection.title} — Mock.shop`);
  return next();
}) satisfies MarkoRun.GET;
