import "server-only";
import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import { createStorefrontClient, createStorefrontRequestContext } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createStorefrontRequestContext({ headers: requestHeaders });

  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(requestHeaders),
      requestContext,
    },
  });
});
