import type { ShopifyRequestContext } from "../request-context";

export function safeApplyResponseHeaders(
  response: Response,
  requestContext: Pick<ShopifyRequestContext, "applyResponseHeaders">,
): Response {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
  }

  const mutableResponse = new Response(response.body, response);
  requestContext.applyResponseHeaders(mutableResponse.headers);
  return mutableResponse;
}
