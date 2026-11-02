import { createContentSecurityPolicy } from "@shopify/hydrogen";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { ServerRouter, type RouterContextProvider } from "react-router";
import type { EntryContext } from "react-router";

import { NonceProvider } from "~/lib/csp";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: RouterContextProvider,
) {
  const { nonce } = createContentSecurityPolicy({
    requestContext: context.shopifyRequestContext,
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN || undefined,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
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
  // The server's finalizer applies the registered policy with applyResponseHeaders().

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
