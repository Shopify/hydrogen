import { loadArticle } from "../../../../lib/loaders";
import { setRouteData } from "../../../../lib/storefront";

export const GET = (async (context, next) => {
  const data = await loadArticle(context);
  setRouteData(context, data, `${data.article.title} — Mock.shop`);
  return next();
}) satisfies MarkoRun.GET;
