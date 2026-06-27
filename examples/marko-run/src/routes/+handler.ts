import { loadHome } from "../lib/loaders";
import { setRouteData } from "../lib/storefront";

export const GET = ((context, next) => {
  setRouteData(context, { home: loadHome(context) }, "Mock.shop — Hydrogen");
  return next();
}) satisfies MarkoRun.GET;
