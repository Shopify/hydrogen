import type { GraphiQLOptions } from "../types";
import { handleShopifyRoutes } from "./handle-shopify-routes";
import { handleGraphiql } from "./interceptors/graphiql";
import type { HydrogenRouteHandler } from "./route-types";

type HydrogenRoutesDevOptions = {
  graphiql?: GraphiQLOptions;
};

export const handleShopifyRoutesDev: HydrogenRouteHandler<HydrogenRoutesDevOptions> = (options) => {
  const productionResult = handleShopifyRoutes(options);
  if (productionResult) return productionResult;

  return handleGraphiql(new URL(options.request.url), options);
};
