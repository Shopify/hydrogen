import { applyStorefrontResponseHeaders, createPrivateStorefrontContext } from "../lib/storefront";

export default Run.ALL(async (context, next) => {
  const { requestContext, storefrontClient } = createPrivateStorefrontContext(context.request);

  const response = await next({
    storefrontClient,
    storefrontRequestContext: requestContext,
  });
  return applyStorefrontResponseHeaders(requestContext, response);
});
