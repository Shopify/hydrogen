import {
  handleShopifyRoutes,
  type HydrogenRouteInterceptor,
  type HydrogenRoutesOptions,
} from "./handle-shopify-routes";
import { handleGraphiql } from "./interceptors/graphiql";
import type { GraphiQLOptions } from "./types";

type HydrogenRoutesDevOptions = {
  graphiql?: GraphiQLOptions;
};

export type HydrogenRoutesOptionsWithDev = HydrogenRoutesOptions & HydrogenRoutesDevOptions;

export const handleShopifyRoutesDev: HydrogenRouteInterceptor<HydrogenRoutesDevOptions> = (
  options,
) => {
  const productionResult = handleShopifyRoutes(options);
  if (productionResult) return productionResult;

  return handleGraphiql(options);
};
