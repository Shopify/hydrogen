import { loadCollections } from "../../lib/loaders";

export const GET = Run.GET(async (context, next) => {
  return next({
    pageTitle: "Collections — Mock.shop",
    ...(await loadCollections(context)),
  });
});
