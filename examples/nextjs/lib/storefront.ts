import "server-only";
import { getBuyerIp } from "@shared/buyer-ip";
import { createExampleStorefrontClient } from "@shared/storefront-client";
import { createStorefrontClient, createStorefrontRequestContext } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createStorefrontRequestContext({ headers: requestHeaders });

  return createExampleStorefrontClient(createStorefrontClient, {
    requestContext,
    buyerIp: getBuyerIp(requestHeaders),
  });
});
