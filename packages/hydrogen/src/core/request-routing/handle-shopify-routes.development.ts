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
 * The development build of handleShopifyRoutes. Your bundler uses it when it
 * resolves the package's `development` export condition. The function serves the
 * same routes as handleShopifyRoutes, then the GraphiQL explorer at `/graphiql`.
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
