import { loadNews } from "../../../lib/loaders";

export const GET = Run.GET(async (context, next) => {
  return next({
    pageTitle: "News — Mock.shop",
    ...(await loadNews(context)),
  });
});
