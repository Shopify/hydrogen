import type { Context, NextResponse } from "@marko/run";
import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
import { getOptionalSharedSecret } from "@shared/private-env";
import {
  createStorefrontClient,
  createShopifyRequestContext,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";

type RequestStorefrontClient = PublicStorefrontClient | RequestScopedPrivateStorefrontClient;

export type StorefrontData = {
  storefrontClient: RequestStorefrontClient;
  storefrontRequestContext: ShopifyRequestContext;
};

export function createStorefrontContext(request: Request) {
  const privateStorefrontToken = getOptionalSharedSecret("PRIVATE_STOREFRONT_API_TOKEN");
  const configuredDomain = process.env.PUBLIC_STORE_DOMAIN || storefrontConfig.storeDomain;
  const isMockShop = configuredDomain === "mock.shop" || configuredDomain.endsWith(".mock.shop");

  if (!privateStorefrontToken || isMockShop) {
    const requestContext = createShopifyRequestContext({ request, i18n: defaultI18n });
    const storefrontClient = createStorefrontClient({
      type: "public",
      requestContext,
      config: { storeDomain: isMockShop ? configuredDomain : "mock.shop" },
    });

    return { requestContext, storefrontClient };
  }

  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
    buyerIp: getBuyerIp(request.headers),
  });
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: configuredDomain,
      privateStorefrontToken,
    },
  });

  return { requestContext, storefrontClient };
}

export function getStorefrontClient(context: Context): RequestStorefrontClient {
  const { storefrontClient } = context.data as Partial<StorefrontData>;
  if (!storefrontClient) {
    throw new Error("Storefront client was not created for this request.");
  }

  return storefrontClient;
}

export function applyStorefrontResponseHeaders<T extends Record<string, unknown>>(
  requestContext: Pick<ShopifyRequestContext, "applyResponseHeaders">,
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
