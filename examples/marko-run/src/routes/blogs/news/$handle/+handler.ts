import { loadArticle } from "../../../../lib/loaders";

export const GET = Run.GET(async (context, next) => {
  const data = await loadArticle(context);
  return next({
    pageTitle: `${data.article.title} — Mock.shop`,
    ...data,
  });
});
