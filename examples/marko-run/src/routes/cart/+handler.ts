import { setRouteData } from "../../lib/storefront";

export const GET = ((context, next) => {
  setRouteData(context, {}, "Cart — Mock.shop");
  return next();
}) satisfies MarkoRun.GET;
