import { loadCollection } from "../../../lib/loaders";

export const GET = Run.GET(async (context, next) => {
  const data = await loadCollection(context);
  return next({
    pageTitle: `${data.collection.title} — Mock.shop`,
    ...data,
  });
});
