import type { Context, NextResponse } from "@marko/run";
import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  type RequestScopedPrivateStorefrontClient,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";

export type StorefrontData = {
  storefrontClient: RequestScopedPrivateStorefrontClient;
  storefrontRequestContext: StorefrontRequestContext;
};

export function createPrivateStorefrontContext(request: Request) {
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(request.headers),
      requestContext,
    },
  });

  return { requestContext, storefrontClient };
}

export function getStorefrontClient(context: Context): RequestScopedPrivateStorefrontClient {
  const { storefrontClient } = context.data as Partial<StorefrontData>;
  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this request.");
  }

  return storefrontClient;
}

export function applyStorefrontResponseHeaders<T extends Record<string, unknown>>(
  requestContext: Pick<StorefrontRequestContext, "applyResponseHeaders">,
  response: Response | NextResponse<T>,
) {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const mutableResponse = new Response(response.body, response);
    requestContext.applyResponseHeaders(mutableResponse.headers);
    return mutableResponse;
  }
}
