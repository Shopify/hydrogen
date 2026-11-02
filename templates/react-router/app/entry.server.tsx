import { createContentSecurityPolicy, createShopifyRequestContext } from "@shopify/hydrogen";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { ServerRouter, type EntryContext, type RouterContextProvider } from "react-router";

import { NonceProvider } from "~/lib/csp";
import { envContext } from "~/lib/env";
import { getMockShopDomain, getStoreDomain, shouldUseMockShop, storefrontConfig } from "~/lib/shop";
import { storefrontRequestContext } from "~/lib/storefront";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: RouterContextProvider,
) {
  const env = context.get(envContext);

  const requestContext =
    context.get(storefrontRequestContext) ??
    createShopifyRequestContext({ request, i18n: storefrontConfig.i18n });
  const { nonce } = createContentSecurityPolicy({
    requestContext,
    shop: {
      storeDomain: shouldUseMockShop(env) ? getMockShopDomain(env) : getStoreDomain(env),
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN || undefined,
    },
  });

  const body = await renderToReadableStream(
    <NonceProvider value={nonce}>
      <ServerRouter context={reactRouterContext} url={request.url} nonce={nonce} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get("user-agent"))) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  requestContext.applyResponseHeaders(responseHeaders);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
