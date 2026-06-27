import { loadProduct } from "../../../lib/loaders";
import { setRouteData } from "../../../lib/storefront";

export const GET = (async (context, next) => {
  const data = await loadProduct(context);
  setRouteData(context, data, `${data.product.title} — Mock.shop`);
  return next();
}) satisfies MarkoRun.GET;
