import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  type RequestScopedPrivateStorefrontClient,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";

export type StorefrontContext = MarkoRun.Context & {
  storefrontClient: RequestScopedPrivateStorefrontClient;
  storefrontRequestContext: StorefrontRequestContext;
  routeData?: unknown;
  pageTitle?: string;
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

export function getStorefrontClient(
  context: MarkoRun.Context,
): RequestScopedPrivateStorefrontClient {
  const storefrontClient = (context as StorefrontContext).storefrontClient;
  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this request.");
  }

  return storefrontClient;
}

export function setRouteData<T>(context: MarkoRun.Context, data: T, pageTitle?: string): void {
  const storefrontContext = context as StorefrontContext;
  storefrontContext.routeData = data;
  storefrontContext.pageTitle = pageTitle;
}

export function getRouteData<T>(context: MarkoRun.Context): T {
  const data = (context as StorefrontContext).routeData;
  if (data === undefined) {
    throw new Error("Route data was not loaded for this page.");
  }

  return data as T;
}

export function applyStorefrontResponseHeaders(
  requestContext: Pick<StorefrontRequestContext, "applyResponseHeaders">,
  response: Response,
): Response {
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
