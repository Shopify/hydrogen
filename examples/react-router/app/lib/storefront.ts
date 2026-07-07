import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { createExampleStorefrontClient } from "@shared/storefront-client";
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

  return createExampleStorefrontClient(createStorefrontClient, {
    requestContext,
    buyerIp: getBuyerIp(request.headers),
  });
}
