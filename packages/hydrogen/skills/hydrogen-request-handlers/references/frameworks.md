# Framework Shapes

This reference covers React Router, SvelteKit, Astro, SolidStart, and unknown server frameworks. For Next.js or Nuxt, read their dedicated references.

## Single-Hook Shape

Use this when one server hook can both return a `Response` before routing and inspect the resolved response status after routing. SvelteKit and Astro fit this shape.

```ts
import {
  createCartServerHandlers,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();

export async function handleRequest(request: Request, next: () => Promise<Response>) {
  const storefrontClient = createRequestScopedPrivateStorefrontClient(request);
  const shopifyRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const response = await next();
  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({ request, storefrontClient });
    if (redirect) return redirect;
  }

  storefrontClient.requestContext.applyResponseHeaders(response.headers);
  return response;
}
```

If `response.headers` is immutable, clone the response before applying headers.

## React Router 7

React Router framework mode needs:

- `future.v8_middleware: true` in `react-router.config.ts`.
- A final splat route such as `route("*", "routes/catchall.tsx")`.
- Root-route middleware that creates the Storefront client, runs Hydrogen routes, stores the client in context, and applies response headers after `next()`.

```tsx
export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, request }, next) => {
    const storefrontClient = createRequestStorefrontClient(request);
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
      if (redirect) return applyStorefrontResponseHeaders(storefrontClient.requestContext, redirect);
    }
    return applyStorefrontResponseHeaders(storefrontClient.requestContext, response);
  },
];
```

Use a helper that catches immutable-header `TypeError` and returns `new Response(response.body, response)` with applied headers.

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
