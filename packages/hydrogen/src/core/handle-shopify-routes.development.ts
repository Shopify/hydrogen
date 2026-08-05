import { handleShopifyRoutes, type HydrogenRoutesOptions } from "./handle-shopify-routes";
import { handleGraphiql } from "./interceptors/graphiql";
import { handleProductsJson } from "./interceptors/products-json";
import type { GraphiQLOptions } from "./types";

export type HydrogenRoutesOptionsWithDev = HydrogenRoutesOptions & {
  graphiql?: GraphiQLOptions;
};

export async function handleShopifyRoutesDev(
  options: HydrogenRoutesOptionsWithDev,
): Promise<Response | null> {
  const productsJson = await handleProductsJson(options);
  if (productsJson) return productsJson;

  const productionResult = await handleShopifyRoutes(options);
  if (productionResult) return productionResult;

  return handleGraphiql(options.request, options.storefrontClient, options.graphiql);
}
