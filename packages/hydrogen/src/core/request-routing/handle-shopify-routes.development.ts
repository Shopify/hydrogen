import type { GraphiQLOptions } from "../types";
import { handleShopifyRoutes } from "./handle-shopify-routes";
import { handleGraphiql } from "./interceptors/graphiql";
import type { HydrogenRouteHandler } from "./route-types";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

/** The development-only options for route handling. */
type HydrogenRoutesDevOptions = {
  /** Settings for the GraphiQL explorer at `/graphiql`. */
  graphiql?: GraphiQLOptions;
};

/**
 * Replaces handleShopifyRoutes under the package's `development` export
 * condition. Serves the production routes first, then the GraphiQL explorer at
 * `/graphiql`.
 *
 * @publicDocs
 */
export const handleShopifyRoutesDev: HydrogenRouteHandler<HydrogenRoutesDevOptions> = (options) => {
  const productionResult = handleShopifyRoutes(options);
  if (productionResult) return productionResult;

  const graphiqlResult = handleGraphiql(new URL(options.request.url), options);
  if (!graphiqlResult) return null;

  return graphiqlResult.then((response) =>
    safeApplyResponseHeaders(response, options.requestContext),
  );
};
