import { loadProduct } from "../../../lib/loaders";

export const GET = Run.GET(async (context, next) => {
  const data = await loadProduct(context);
  return next({
    pageTitle: `${data.product.title} — Mock.shop`,
    ...data,
  });
});
