import { handleShopifyRoutes } from "./handle-shopify-routes";
import { handleGraphiql } from "./interceptors/graphiql";
import type { HydrogenRouteHandler, HydrogenRoutesOptions } from "./route-types";
import type { GraphiQLOptions } from "../types";

type HydrogenRoutesDevOptions = {
  graphiql?: GraphiQLOptions;
};

export type HydrogenRoutesOptionsWithDev = HydrogenRoutesOptions & HydrogenRoutesDevOptions;

export const handleShopifyRoutesDev: HydrogenRouteHandler<HydrogenRoutesDevOptions> = (options) => {
  const productionResult = handleShopifyRoutes(options);
  if (productionResult) return productionResult;

  return handleGraphiql(new URL(options.request.url), options);
};
