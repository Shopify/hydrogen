# Request Handlers

This setup reference is intentionally only a pointer. The canonical, current request-handler guidance lives in the standalone `hydrogen-request-handlers` skill.

Use that skill when wiring or reviewing:

- `handleShopifyRoutes()` before framework routing.
- `handleShopifyRedirects()` only after a framework 404 or in a catch-all/not-found route.
- `createStorefrontRequestContext(request)` and response-header propagation.
- Cart server handlers via `handlers: [cartHandlers]`.
- Next.js `proxy.ts` plus `app/not-found.tsx`.
- Nuxt/Nitro middleware, `beforeResponse` header propagation, and `error.vue`.

Keeping this file as a redirect avoids stale duplicated snippets in the setup skill.
