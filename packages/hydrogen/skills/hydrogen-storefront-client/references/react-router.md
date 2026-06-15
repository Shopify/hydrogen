# React Router 7

Middleware creates a per-request private client with buyer IP already resolved from trusted headers. `requestContext` carries request lifecycle headers and captures SFAPI response headers so middleware can merge them into the final response.

```ts
// app/storefront.context.ts
import { createContext } from "react-router";
import type { RequestScopedPrivateStorefrontClient } from "@shopify/hydrogen";

export const storefrontContext = createContext<RequestScopedPrivateStorefrontClient>();
```

```ts
// app/storefront.middleware.ts
import {
  createStorefrontClient,
  createStorefrontRequestContext,
} from "@shopify/hydrogen";
import { storefrontContext } from "./storefront.context";
import type { Route } from "./+types/root";

export const storefrontMiddleware: Route.MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const buyerIp = request.headers.get("cf-connecting-ip");
  if (!buyerIp) throw new Error("cf-connecting-ip is required for private SFAPI clients");
  const requestContext = createStorefrontRequestContext(request);

  const client = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp,
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });

  context.set(storefrontContext, client);

  const response = await next();
  requestContext.applyResponseHeaders(response.headers);
  return response;
};
```

```ts
// app/root.tsx — wire up middleware
import { storefrontMiddleware } from "./storefront.middleware";
import type { Route } from "./+types/root";

export const middleware: Route.MiddlewareFunction[] = [storefrontMiddleware];
```

Enable React Router framework middleware with `future.v8_middleware: true` in `react-router.config.ts`. If the app also needs Hydrogen route handlers and Shopify redirects, use the `hydrogen-request-handlers` React Router shape so this client creation, `handleShopifyRoutes()`, context setup, `handleShopifyRedirects()`, and response-header propagation all live in one root middleware chain.

```ts
// app/routes/product.tsx — loader reads client from context
import { storefrontContext } from "~/storefront.context";
import { gql } from "@shopify/hydrogen";
import type { Route } from "./+types/product";

const PRODUCT_QUERY = gql(`
  query Product($handle: String!) {
    product(handle: $handle) { title description }
  }
`);

export async function loader({ context, params }: Route.LoaderArgs) {
  const client = context.get(storefrontContext);
  const { data } = await client.graphql(PRODUCT_QUERY, {
    variables: { handle: params.handle },
  });
  return { product: data?.product };
}
```

Because `buyerIp` and `requestContext` are resolved in the middleware, loaders don't need to pass `request` to `graphql()` — the client is ready to use directly from context. The request context captures SFAPI response headers, and the middleware merges them after `next()` returns so `Set-Cookie` and other headers propagate to the browser without each loader handling them.
