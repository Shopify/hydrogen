import type { GraphiQLOptions } from "../types";
import { handleShopifyRoutes } from "./handle-shopify-routes";
import { handleGraphiql } from "./interceptors/graphiql";
import type { HydrogenRouteHandler } from "./route-types";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

type HydrogenRoutesDevOptions = {
  graphiql?: GraphiQLOptions;
};

export const handleShopifyRoutesDev: HydrogenRouteHandler<HydrogenRoutesDevOptions> = (options) => {
  const productionResult = handleShopifyRoutes(options);
  if (productionResult) return productionResult;

  const graphiqlResult = handleGraphiql(new URL(options.request.url), options);
  if (!graphiqlResult) return null;

  return graphiqlResult.then((response) =>
    safeApplyResponseHeaders(response, options.requestContext),
  );
};
