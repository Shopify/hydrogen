# Request Handlers

**Prerequisites:** A scaffolded framework app with a server-side request hook (or middleware slot) and a place to put a shared module (e.g. `app/lib/`). Does not depend on route components or design — apply this before any route work so the interceptors are in place when routes start landing on top of them.

Hydrogen ships two framework-neutral request interceptors — `handleShopifyRoutes` and `handleShopifyRedirects` — that need to be wired into your framework's server request lifecycle. The two functions, the gate between them, and where they live in your app are not interchangeable. This reference encodes verified shapes for common frameworks and the rule for adapting to one not listed.

## What you're installing, and why two

```
Request
  │
  ▼
handleShopifyRoutes() ──▶ Response   (Hydrogen-owned and registered URLs)
  │
  │ null
  ▼
Framework Router ──▶ Response
  │
  │ status === 404
  ▼
handleShopifyRedirects() ──▶ Response   (admin redirect / SFAPI URL redirects / query-param redirects)
  │
  │ null
  ▼
Framework's 404 page
```

**`handleShopifyRoutes` (pre-routing)** owns Hydrogen URL shapes the framework router should never see:

- **SFAPI proxy** — `/api/{version}/graphql.json` (e.g. `/api/2025-04/graphql.json`, `/api/unstable/graphql.json`). Forwards the GraphQL request to `{storefrontClient.storeUrl}/api/{version}/graphql.json` with a curated incoming-header allowlist. It does not inject public or private tokens from server config. Streams the upstream response through. Returns `502` JSON on network error.
- **Registered route handlers** — app-installed Hydrogen handlers such as `createCartServerHandlers()` for `/api/cart`. These are explicit: `handleShopifyRoutes` only owns them when the app passes them through `handlers`.
- **MCP proxy** — `/api/mcp`. Same forwarding pattern, server-to-server allowlist (no CORS or browser tracking headers). Returns a JSON-RPC error envelope on network failure.
- **GraphiQL** — `GET /graphiql`. Only present when the consumer imports from the `development` entrypoint condition. Bundlers (Vite, webpack) auto-resolve `development` when `NODE_ENV === 'development'`; the production bundle excludes it entirely.

Returns a `Response` for matches, `null` for everything else.

**`handleShopifyRedirects` (post-routing, only on 404)** handles redirect lookups, in order:

- **Admin redirect** — if the path is `/admin`, returns a `301` to `/admin` on `storefrontClient.storeUrl`.
- **Storefront URL redirects** — queries the Storefront API's `urlRedirects` GraphQL field for merchant-configured redirects. Returns a `301` with `Location` set; query params from the original request are merged onto the redirect target.
- **Query-param redirects** — checks for `?return_to=` or `?redirect=`. Cross-domain targets are silently rejected (open-redirect protection). Same-origin targets return a `301`.

Returns a `Response` for matches, `null` to fall through to the framework's 404 page.

**Why the split.** The Storefront URL-redirects lookup is a network round-trip to the shop's Storefront API endpoint. Running it on every request — including ones the framework router matches — would put a remote fetch on the hot path. Gating it on `response.status === 404` makes the redirect check pay-per-miss instead of pay-per-request, and means the framework's own routes always win when they exist.

## Configuration

Both helpers accept the request-scoped private `storefrontClient` created with `createStorefrontClient` from `@shopify/hydrogen`. Proxy interceptors use `storefrontClient.storeUrl` only to build upstream URLs; they do not execute through the private client and they do not inject the private token into proxied buyer requests.

Route and redirect interceptors require the app to pass this client so cart, checkout, admin, and URL redirect lookups reuse the same per-request client instead of creating fallback clients internally.

## Hard requirements

- **Both interceptors must run in production.** Only GraphiQL is dev-only. Built-in proxy/route behavior, registered route handlers, and redirect behavior are all production runtime behavior. Wiring them into a dev-only middleware slot will make production requests 404 on Hydrogen-owned URLs.
- **Pre-routing first, post-routing-404 second.** The two helpers are not interchangeable. Wiring `handleShopifyRedirects` pre-routing pays the SFAPI URL-redirects fetch on every request; wiring `handleShopifyRoutes` post-routing means the framework router has already 404'd on `/api/.../graphql.json`.
- **Framework idioms are load-bearing.** The shapes below are not stylistic — each one expresses the same gate in the way the host framework's request lifecycle actually allows. Don't force two shapes into one.
- **Create one private client per request.** Resolve `buyerIp` and `requestContext` before invoking Hydrogen request handlers, then pass that same `storefrontClient` into `handleShopifyRoutes`, `handleShopifyRedirects`, cart server handlers, and server data loaders.

## The generic shape

Independent of framework, the wiring expresses three things in order:

```
0. Module scope:
     cartHandlers = createCartServerHandlers()

1. Pre-routing hook:
     storefrontClient = createRequestScopedPrivateStorefrontClient(request)
     kitRoute = await handleShopifyRoutes({
       request,
       storefrontClient,
       handlers: [cartHandlers]
     })
     if (kitRoute) return kitRoute

2. Run the framework router. Get a Response back (or signal a 404).

3. Post-routing-404 hook:
     if (response.status === 404) {
       redirect = await handleShopifyRedirects({ request, storefrontClient })
       if (redirect) return redirect
     }
     return response
```

Two slots, both server-side. The framework determines whether they live in one hook or two, and whether step 3 is expressed as a hook or a route.

`createRequestScopedPrivateStorefrontClient` in the snippets is app-owned glue around `createStorefrontClient({ type: "private" })`, `createStorefrontRequestContext(request)`, and trusted buyer IP extraction. `cartHandlers` can be created once at module scope; it receives the request-scoped client when `handleShopifyRoutes` invokes the matching `/api/cart` handler.

## Framework-specific shapes

Pick the shape that matches your framework, or skip to §"Adapting to a new framework" below.

### SvelteKit (`src/hooks.server.ts`)

The cleanest case — both calls live in the same `handle` hook because SvelteKit's hook can both return `Response` early and observe the resolved response.

```ts
import type { Handle } from '@sveltejs/kit';
import { createCartServerHandlers, handleShopifyRedirects, handleShopifyRoutes } from '@shopify/hydrogen';

const cartHandlers = createCartServerHandlers();

export const handle: Handle = async ({ event, resolve }) => {
  const storefrontClient = createRequestScopedPrivateStorefrontClient(event.request);
  const kitRoute = await handleShopifyRoutes({
    request: event.request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (kitRoute) return kitRoute;

  const response = await resolve(event);

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request: event.request,
      storefrontClient,
    });
    if (redirect) return redirect;
  }

  return response;
};
```

### Astro (`src/middleware.ts`)

Same shape as SvelteKit, expressed in Astro's middleware API.

```ts
import { defineMiddleware } from "astro:middleware";
import { createCartServerHandlers, handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const storefrontClient = createRequestScopedPrivateStorefrontClient(request);
  const kitRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (kitRoute) return kitRoute;

  const response = await next();

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({ request, storefrontClient });
    if (redirect) return redirect;
  }

  return response;
});
```

### React Router 7 (`app/root.tsx` + config)

React Router has the same gate as SvelteKit/Astro, but requires two pieces of config to make root-route middleware fire on every URL:

1. **`future.v8_middleware: true`** in `react-router.config.ts`. The middleware API is stable as of 7.9 but is still gated behind this flag in framework mode (turning it on is a type-level breaking change for `getLoadContext`). Without it, the middleware export is silently ignored.
2. **A catch-all route** (`route("*", "routes/catchall.tsx")`). Without it, RR throws "No routes matched location" before middleware runs and the interceptors never see unmatched URLs (`/admin`, redirect candidates, etc.).

`react-router.config.ts`:

```ts
import type { Config } from "@react-router/dev/config";
export default {
  ssr: true,
  future: { v8_middleware: true },
} satisfies Config;
```

`app/routes.ts`:

```ts
import { type RouteConfig, route } from "@react-router/dev/routes";
export default [
  // ...your real routes...
  route("*", "routes/catchall.tsx"), // makes root middleware see unmatched URLs
] satisfies RouteConfig;
```

`app/routes/catchall.tsx`:

```tsx
export async function loader() {
  throw new Response("Not Found", { status: 404 });
}
export default function CatchAll() {
  return null;
}
```

`app/root.tsx` (middleware export — keep your existing layout):

```tsx
import { createCartServerHandlers, handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";
import type { Route } from "./+types/root";

const cartHandlers = createCartServerHandlers();

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }, next) => {
    const storefrontClient = createRequestScopedPrivateStorefrontClient(request);
    const kitRoute = await handleShopifyRoutes({
      request,
      storefrontClient,
      handlers: [cartHandlers],
    });
    if (kitRoute) return kitRoute;

    const response = await next();
    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({ request, storefrontClient });
      if (redirect) return redirect;
    }
    return response;
  },
];
```

### Next.js App Router (Next 16+)

Next splits the gate across two files because Next's `proxy.ts` (formerly `middleware.ts`) cannot observe the routed response, and not-found UI only renders inside `app/not-found.tsx` — and that file does not have access to the requested URL by default.

The workaround is a header pass: `proxy.ts` writes the original URL into `x-storefront-url` on the rewritten request; `not-found.tsx` reads it back via `headers()` and reconstructs a `Request` to feed `handleShopifyRedirects`.

`proxy.ts` (project root — Next 16 renamed `middleware.ts` → `proxy.ts`):

```ts
import { createCartServerHandlers, handleShopifyRoutes } from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

const cartHandlers = createCartServerHandlers();

export async function proxy(request: NextRequest) {
  const storefrontClient = createRequestScopedPrivateStorefrontClient(request);
  const kitRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (kitRoute) return kitRoute;

  // Forward the original URL so app/not-found.tsx can hand it to handleShopifyRedirects.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-storefront-url", request.url);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
```

`app/not-found.tsx`:

```tsx
import { handleShopifyRedirects } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Reading headers() and possibly redirecting must happen per-request.
export const dynamic = "force-dynamic";

export default async function NotFound() {
  const url = (await headers()).get("x-storefront-url");
  if (url) {
    const storefrontClient = await getStorefrontClient();
    const result = await handleShopifyRedirects({
      request: new Request(url),
      storefrontClient,
    });
    const location = result?.headers.get("location");
    if (location) redirect(location);
  }
  return <main><h1>404</h1><p>The requested page could not be found.</p></main>;
}
```

Two non-obvious requirements:

- **`export const dynamic = "force-dynamic"`** is mandatory. Without it, Next tries to statically prerender `not-found.tsx`, which crashes because `headers()` and `redirect()` are per-request APIs.
- **Status code is not preserved.** The interceptor returns `301`; Next's `redirect()` from `next/navigation` re-issues it as `307`. If `301` specifically matters (SEO, caching), use a framework escape hatch or return the `Response` directly from a route handler instead.

### Solid Start (`src/middleware.ts` + `src/routes/[...404].tsx`)

Solid Start is the one framework where the SvelteKit-shape post-routing 404 hook does not work:

- `onBeforeResponse` fires before SSR begins, so it always sees status `200` — there is no point at which middleware can observe the framework's 404.
- Returning a `Response` from `onBeforeResponse` after the streamer has started crashes with `ERR_HTTP_HEADERS_SENT`.

Solution: split `handleShopifyRoutes` into the middleware (where it works fine) and move `handleShopifyRedirects` into a catch-all route. Solid's router only renders the catch-all when nothing else matches — that is the same gate the other frameworks express via `response.status === 404`, expressed as a route instead of a hook.

`src/middleware.ts`:

```ts
import { createMiddleware } from "@solidjs/start/middleware";
import { createCartServerHandlers, handleShopifyRoutes } from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();

export default createMiddleware({
  onRequest: [
    async (event) => {
      const storefrontClient = createRequestScopedPrivateStorefrontClient(event.request);
      const kitRoute = await handleShopifyRoutes({
        request: event.request,
        storefrontClient,
        handlers: [cartHandlers],
      });
      if (kitRoute) return kitRoute;
    },
  ],
});
```

`src/routes/[...404].tsx`:

```tsx
import { HttpStatusCode } from "@solidjs/start";
import { query, redirect, type RouteDefinition } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { handleShopifyRedirects } from "@shopify/hydrogen";

const lookupRedirect = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (!event) return null;
  const { storefrontClient } = event.locals;
  if (!storefrontClient) throw new Error("Storefront client was not created for this server request.");
  const result = await handleShopifyRedirects({
    request: event.request,
    storefrontClient,
  });
  const location = result?.headers.get("location");
  if (location) throw redirect(location, result!.status);
  return null;
}, "storefront-redirect");

export const route = {
  preload: () => lookupRedirect(),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <>
      <HttpStatusCode code={404} />
      <main><h1>404</h1></main>
    </>
  );
}
```

Note: `redirect()` from `@solidjs/router` may default to `302` and not preserve the `301` from `handleAdminRedirect`. Same class of issue as Next.js. If `301` specifically matters, flag it.

## Adapting to a new framework

Some frameworks need a catch-all route. The pattern that predicts whether your framework needs one:

A framework can express the wiring in a **single hook** (the SvelteKit / Astro shape) when it has one server hook that can both:

- (a) **return a `Response`** to short-circuit the router, AND
- (b) **observe the resolved response's `status`** after the router runs.

If both are true, use the single-hook shape.

If (a) is true but (b) is false, look at the framework's **not-found UI route**. If it can run server code per-request and trigger a redirect, you have the **Next.js shape**: pre-routing hook for `handleShopifyRoutes`, not-found UI for `handleShopifyRedirects`, bridged by writing the request URL into a header (because not-found UI typically does not receive the original request).

If neither hook nor not-found UI fits (b), register a **catch-all route at the lowest priority** and call `handleShopifyRedirects` from a `loader` / `preload` / equivalent. That's the **Solid Start shape** — the catch-all only renders when nothing else matches, which is the same gate as `response.status === 404` expressed at the routing layer instead of the middleware layer.

Decision order when wiring an unfamiliar framework:

1. Find the framework's pre-routing hook. If it can return `Response`, that is where `handleShopifyRoutes` goes. If not, the framework probably can't host these interceptors — surface that.
2. Try the single-hook shape first. If the same hook can observe post-routing status, you are done.
3. If not, look for a not-found UI route that runs server code per-request. Use the header-pass shape.
4. If that does not work either, register a splat route last in route priority and call `handleShopifyRedirects` from it.

## Common gotchas

- **Next 16 rename: `middleware.ts` → `proxy.ts`.** Older docs and tutorials may still reference `middleware.ts`. On Next 16+, use `proxy.ts`.
- **`force-dynamic` in Next's `not-found.tsx`.** Without `export const dynamic = "force-dynamic"`, Next prerenders the not-found page at build time, which crashes on `headers()` and `redirect()` calls.
- **React Router 7's `future.v8_middleware: true`.** The middleware API is stable but still gated behind this flag in framework mode. Without it, the middleware export is silently ignored — no error, just a no-op.
- **React Router 7 catch-all route.** Without `route("*", ...)`, RR throws "No routes matched location" before middleware fires. Middleware never sees `/admin`, redirect candidates, or Hydrogen-owned proxy URLs.
- **Status-code preservation.** `handleShopifyRedirects` returns `301`. Several frameworks' `redirect()` helpers default to `302` or `307`. If `301` specifically matters (SEO permanence, edge caching), either return the `Response` directly from a route handler that bypasses the framework's redirect helper, or use a framework-specific permanent-redirect API.
- **Per-handler functions are not exported.** `handleAdminRedirect`, `handleUrlRedirects`, and `handleQueryParamRedirect` are bundled inside `handleShopifyRedirects`. If you need only some of them at a different point in the lifecycle, you cannot currently express that — the whole chain runs together.
- **Solid Start `onBeforeResponse` does not work for redirects.** It fires before SSR (always status `200`) and returning a `Response` after streaming starts crashes. Use the catch-all route shape.
- **No buyer-IP inference.** The interceptors are neutral and do not infer trusted buyer IP headers. Build `buyerIp` in app code from trusted request data, then pass the resulting private `storefrontClient` into the handlers.

## Verify

After wiring, hit these URLs against your dev server (and again against your production build) to confirm each path works:

1. **Hydrogen-owned route fires** — `curl -X POST http://localhost:<port>/api/unstable/graphql.json -H "content-type: application/json" -d '{"query":"{shop{name}}"}'` should return JSON, not a 404. If you get a 404, `handleShopifyRoutes` is not running pre-routing.
2. **Cart handler fires** — `curl -i http://localhost:<port>/api/cart` should return JSON, not a 404. If you get a 404, `createCartServerHandlers()` was not passed through `handlers`.
3. **Admin redirect fires** — `curl -i http://localhost:<port>/admin` should return a `3xx` with `Location` pointing at `/admin` on the configured Storefront client URL. If you get a 200 or 404, `handleShopifyRedirects` is not running.
4. **Unmatched URL falls through** — `curl -i http://localhost:<port>/this-does-not-exist` should return `404` with your framework's not-found page. This proves `handleShopifyRedirects` ran, returned `null`, and fell through to the framework's 404 path correctly.

Then build and run the production bundle. The production bundle resolves the `default` export condition, not `development` — if interceptors only work in dev, the wiring is in a dev-only slot.

## Anti-patterns

- **Don't wire interceptors into a dev-only middleware slot.** Only GraphiQL is dev-only — the rest are production behavior. Misreading the dev/prod entrypoint split as "interceptors are mostly for dev" is a common trap.
- **Don't run `handleShopifyRedirects` pre-routing.** It puts an SFAPI URL-redirects fetch on every request, including ones the framework matches. The 404 gate exists for a reason.
- **Don't run `handleShopifyRoutes` post-routing.** The framework router will 404 on `/api/.../graphql.json` first.
- **Don't create multiple Storefront clients per request.** One request-scoped private client should flow into route handlers, redirects, cart server handlers, and server loaders.
- **Don't force two frameworks into identical code.** If the SvelteKit/Astro shape doesn't fit your framework, the right answer is the header-pass or catch-all-route shape, not a shoehorn.
- **Don't ship without smoke tests.** Type-checking is necessary, not sufficient. Hit the URLs above against the running dev server *and* against the production build before declaring done.
