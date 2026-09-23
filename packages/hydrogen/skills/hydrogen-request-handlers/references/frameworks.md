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

This shape assumes app-owned `getBuyerIp`, `createSessionManager`, and `routeTemplates` values.

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
    routeTemplates,
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
- A server entry that restores the public `request.url` with `createPublicRequest` before calling React Router's request handler. See "React Router Origin Check" below.

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
      routeTemplates,
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

### React Router Origin Check

React Router rejects `POST`, `PUT`, `PATCH`, and `DELETE` requests whose `Origin` header does not match the request, returning a bare `400 Bad Request`. The check runs before `staticHandler.query()`, so it runs before any route middleware. What it compares against depends on the version:

| React Router | `Origin` compared against |
| --- | --- |
| <= 7.17 | `x-forwarded-host`, then `host` (host only) |
| 7.18.0 to 7.18.2, 8.0.0 to 8.3.0 | `new URL(request.url).host` (forwarded headers ignored) |
| >= 7.18.3, >= 8.3.1 | `new URL(request.url).origin` (scheme + host + port) |

Behind a proxy that terminates TLS, such as Hydrogen's `localHttps` dev plugin or a tunnel, the server sees `http://localhost:5173` while the browser sends `Origin: https://local.tryhydrogen.dev:5173`. Newer React Router versions then reject every cart and form mutation. Fixing `request` in root middleware is too late. Restore the public URL in the server entry and pass that request to React Router:

```ts
import { createPublicRequest } from "@shopify/hydrogen";
import { createRequestHandler } from "react-router";

export default {
  async fetch(incomingRequest: Request, env: Env, executionContext: ExecutionContext) {
    const request = createPublicRequest(incomingRequest, {
      // Trust forwarded headers only when a proxy you control sets them.
      trustForwardedHeaders: import.meta.env.DEV,
    });
    const handleRequest = createRequestHandler(serverBuild, import.meta.env.MODE);
    return handleRequest(request, await createAppLoadContext(request, env, executionContext));
  },
};
```

Clients can send `x-forwarded-*` headers themselves, so only set `trustForwardedHeaders: true` when a proxy you control overwrites them. Oxygen already passes the public URL as `request.url`, so production Oxygen deployments do not need it. Root middleware then receives the normalized request, so `handleShopifyRoutes`, redirects, and Customer Account OAuth URLs use the public origin.

`allowedActionOrigins` in `react-router.config.ts` is for genuinely cross-origin form submissions. Do not use it to work around a reverse proxy: it leaves `request.url` wrong for redirects and OAuth.

## SolidStart

SolidStart middleware can short-circuit before routing, but cannot reliably observe the final 404 after SSR streaming starts. Put `handleShopifyRoutes` in middleware and `handleShopifyRedirects` in a last-priority catch-all route.

In middleware, create an app-owned request-scoped `sessionManager` before calling `handleShopifyRoutes`:

```ts
const shopifyRoute = handleShopifyRoutes({
  request: event.request,
  requestContext,
  sessionManager,
  storefrontClient,
  routeTemplates,
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
- Behind a TLS-terminating proxy, restore the public `request.url` with `createPublicRequest` in the server entry, before the framework's own origin or CSRF checks. Middleware runs too late for React Router.
- Do not create a second Storefront client inside loaders when one already exists in request context.
- Framework redirect helpers may turn Hydrogen's `301` into `302` or `307`.
