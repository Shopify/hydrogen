import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  type RequestScopedPrivateStorefrontClient,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";
import { createContext } from "react-router";

export { storefrontConfig };

export const storefrontClientContext = createContext<RequestScopedPrivateStorefrontClient>();
export const storefrontRequestContext = createContext<StorefrontRequestContext>();

export function createRequestStorefrontClient(request: Request) {
  const requestContext = createStorefrontRequestContext(request);

  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(request.headers),
      requestContext,
    },
  });
}
