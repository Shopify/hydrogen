import { handleShopifyRoutes, type HydrogenRoutesOptions } from "./handle-shopify-routes";
import { handleGraphiql } from "./interceptors/graphiql";
import type { GraphiQLOptions } from "./types";

export type HydrogenRoutesOptionsWithDev = HydrogenRoutesOptions & {
  graphiql?: GraphiQLOptions;
};

export function handleShopifyRoutesDev(
  options: HydrogenRoutesOptionsWithDev,
): null | Promise<Response> {
  const productionResult = handleShopifyRoutes(options);
  if (productionResult) return productionResult;

  return handleGraphiql(options.request, options.storefrontClient, options.graphiql);
}
