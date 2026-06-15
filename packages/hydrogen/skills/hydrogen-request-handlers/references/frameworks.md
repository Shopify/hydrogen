# Framework Shapes

This reference covers React Router, SvelteKit, Astro, SolidStart, and unknown server frameworks. For Next.js or Nuxt, read their dedicated references.

## Single-Hook Shape

Use this when one server hook can both return a `Response` before routing and inspect the resolved response status after routing. SvelteKit and Astro fit this shape.

Resolve `buyerIp` with the app's trusted deployment header before creating the private client. Use the buyer-IP guidance from `hydrogen-storefront-client`.

```ts
import {
  createCartServerHandlers,
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();

export async function handleRequest(request: Request, next: () => Promise<Response>) {
  const requestContext = createStorefrontRequestContext(request);
  const buyerIp = getBuyerIp(request.headers);
  const storefrontClient = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp,
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });

  const shopifyRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const response = await next();
  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({ request, storefrontClient });
    if (redirect) {
      storefrontClient.requestContext.applyResponseHeaders(redirect.headers);
      return redirect;
    }
  }

  storefrontClient.requestContext.applyResponseHeaders(response.headers);
  return response;
}
```

## React Router 7

React Router framework mode needs:

- Verify `future.v8_middleware: true` is set in `react-router.config.ts`.
- A final splat route such as `route("*", "routes/catchall.tsx")`.
- Root-route middleware that creates the Storefront client, runs Hydrogen routes, stores the client in context, and applies response headers after `next()`.
- Trusted buyer-IP resolution before `createStorefrontClient`; use the buyer-IP guidance from `hydrogen-storefront-client`.

```tsx
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, request }, next) => {
    const requestContext = createStorefrontRequestContext(request);
    const buyerIp = getBuyerIp(request.headers);
    const storefrontClient = createStorefrontClient({
      type: "private",
      config: {
        storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
        privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
        buyerIp,
        requestContext,
        i18n: { country: "US", language: "EN" },
      },
    });

    const shopifyRoute = await handleShopifyRoutes({
      request,
      storefrontClient,
      handlers: [cartHandlers],
    });
    if (shopifyRoute) return shopifyRoute;

    context.set(storefrontClientContext, storefrontClient);

    const response = await next();
    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({ request, storefrontClient });
      if (redirect) {
        storefrontClient.requestContext.applyResponseHeaders(redirect.headers);
        return redirect;
      }
    }
    storefrontClient.requestContext.applyResponseHeaders(response.headers);
    return response;
  },
];
```

## SolidStart

SolidStart middleware can short-circuit before routing, but cannot reliably observe the final 404 after SSR streaming starts. Put `handleShopifyRoutes` in middleware and `handleShopifyRedirects` in a last-priority catch-all route.

In middleware:

```ts
const shopifyRoute = await handleShopifyRoutes({
  request: event.request,
  storefrontClient,
  handlers: [cartHandlers],
});
if (shopifyRoute) return shopifyRoute;
```

In `src/routes/[...404].tsx`, run `handleShopifyRedirects` from a server query/preload and redirect if it returns a location. Preserve the returned status only if the framework redirect API supports it.

## Unknown Framework Decision Tree

1. Find the pre-routing hook. If it cannot return a `Response`, the framework cannot host `handleShopifyRoutes` correctly.
2. If the same hook can inspect final response status, use the single-hook shape.
3. If not, check whether the not-found UI route runs per-request server code. Use a header-pass shape like Next.
4. If not, register a final catch-all route and run `handleShopifyRedirects` there.

## Gotchas

- Never run `handleShopifyRedirects` pre-routing.
- Never run `handleShopifyRoutes` after framework routing.
- Do not create a second Storefront client inside loaders when one already exists in request context.
- Framework redirect helpers may turn Hydrogen's `301` into `302` or `307`.
