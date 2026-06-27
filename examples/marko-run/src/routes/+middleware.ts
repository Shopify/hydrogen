import {
  applyStorefrontResponseHeaders,
  createPrivateStorefrontContext,
  type StorefrontContext,
} from "../lib/storefront";

export default (async (context, next) => {
  const { requestContext, storefrontClient } = createPrivateStorefrontContext(context.request);
  const storefrontContext = context as StorefrontContext;

  storefrontContext.storefrontRequestContext = requestContext;
  storefrontContext.storefrontClient = storefrontClient;

  const response = await next();
  return applyStorefrontResponseHeaders(requestContext, response);
}) satisfies MarkoRun.Handler;
