# Framework Shapes

## Contents

- Single-Hook Shape
- React Router 7
- SolidStart
- Unknown Framework Decision Tree
- Gotchas

This reference covers React Router, SvelteKit, Astro, SolidStart, and unknown server frameworks. For Next.js, read its dedicated reference.

## Single-Hook Shape

Use this when one server hook can both return a `Response` before routing and inspect the resolved response status after routing. SvelteKit and Astro fit this shape.

The example lets the framework handle rejected route promises, so it returns a matched promise directly. If the app instead wraps the request lifecycle in a `try/catch` that creates an error `Response`, await only after the truthy check so that boundary also catches a matched route rejection:

```ts
try {
  const shopifyRoute = handleShopifyRoutes(options);
  if (shopifyRoute) return await shopifyRoute;

  // Continue framework routing.
} catch (error) {
  logger.error(error);
  return new Response("Unexpected error", { status: 500 });
}
```

Prefer this over adding `.catch()` only to the returned promise: the request-level boundary also handles synchronous setup and validation errors.

The scaffold defaults to a public client; `PUBLIC_STOREFRONT_API_TOKEN` may be unset, which means tokenless access (all mock.shop supports). Once the app has a private token and trusted buyer context, switch to `type: "private"` and resolve `buyerIp` per the `hydrogen-storefront-client` buyer-IP guidance.

```ts
import {
  createCartServerHandlers,
  createPredictiveSearchServerHandlers,
  createStorefrontClient,
  createShopifyRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();
const predictiveSearchHandlers = createPredictiveSearchServerHandlers();

export async function handleRequest(request: Request, next: () => Promise<Response>) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  const sessionManager = await createSessionManager(request);
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN,
    },
  });

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers: [cartHandlers, predictiveSearchHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const response = await next();
  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({ request, routeTemplates, storefrontClient });
    if (redirect) return redirect;
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
- A public Storefront client by default; when upgrading to `type: "private"`, resolve trusted `buyerIp` before `createStorefrontClient` per the buyer-IP guidance from `hydrogen-storefront-client`.

```tsx
import {
  createCartServerHandlers,
  createPredictiveSearchServerHandlers,
  createStorefrontClient,
  createShopifyRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();
const predictiveSearchHandlers = createPredictiveSearchServerHandlers();

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, request }, next) => {
    const requestContext = createShopifyRequestContext({
      request,
      i18n: { country: "US", language: "EN" },
    });
    const sessionManager = await createSessionManager(request);
    const storefrontClient = createStorefrontClient({
      type: "public",
      requestContext,
      config: {
        storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
        publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN,
      },
    });

    const shopifyRoute = handleShopifyRoutes({
      request,
      requestContext,
      sessionManager,
      storefrontClient,
      handlers: [cartHandlers, predictiveSearchHandlers],
    });
    if (shopifyRoute) return shopifyRoute;

    context.set(storefrontClientContext, storefrontClient);

    const response = await next();
    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({ request, routeTemplates, storefrontClient });
      if (redirect) return redirect;
    }
    storefrontClient.requestContext.applyResponseHeaders(response.headers);
    return response;
  },
];
```

## SolidStart

SolidStart middleware can short-circuit before routing, but cannot reliably observe the final 404 after SSR streaming starts. Put `handleShopifyRoutes` in middleware and `handleShopifyRedirects` in a last-priority catch-all route.

In middleware, create an app-owned request-scoped `sessionManager` before calling `handleShopifyRoutes`:

```ts
const shopifyRoute = handleShopifyRoutes({
  request: event.request,
  requestContext,
  sessionManager,
  storefrontClient,
  handlers: [cartHandlers, predictiveSearchHandlers],
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
