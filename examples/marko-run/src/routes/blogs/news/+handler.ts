import { loadNews } from "../../../lib/loaders";
import { setRouteData } from "../../../lib/storefront";

export const GET = (async (context, next) => {
  setRouteData(context, await loadNews(context), "News — Mock.shop");
  return next();
}) satisfies MarkoRun.GET;
