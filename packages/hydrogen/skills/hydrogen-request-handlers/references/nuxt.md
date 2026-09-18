# Nuxt And Nitro

## Contents

- Server Middleware
- Server Plugin Injection
- Response Headers
- 404 Redirects
- Client Storefront Plugin
- Gotchas

Nuxt needs three pieces:

1. Nitro middleware for `handleShopifyRoutes` and request-scoped client creation.
2. A server plugin that applies captured Storefront response headers before Nitro responds.
3. `error.vue` handling for post-routing Shopify redirects on 404.

## Server Middleware

Create `server/middleware/shopify.ts`:

The scaffold defaults to a public client; `PUBLIC_STOREFRONT_API_TOKEN` may be unset, which means tokenless access (all mock.shop supports). Once the app has a private token and trusted buyer context, switch to `type: "private"` and resolve `buyerIp` from the app's trusted deployment headers per the buyer-IP guidance from `hydrogen-storefront-client`.

Create app-owned `sessionManager` and `routeTemplates` values before `handleShopifyRoutes`; the session manager must be request-scoped.

```ts
import {
  createCartServerHandlers,
  createStorefrontClient,
  createShopifyRequestContext,
  handleShopifyRoutes,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  const sessionManager = await createSessionManager(request);
  const storefrontClient = createPublicStorefrontClient(requestContext);

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return sendWebResponse(event, await shopifyRoute);

  event.context.shopifyRequestContext = requestContext;
  event.context.storefrontClient = storefrontClient;
});

function createPublicStorefrontClient(requestContext: ShopifyRequestContext) {
  return createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN,
    },
  });
}
```

This middleware awaits a matched promise because `sendWebResponse` needs the resolved `Response`; rejected promises continue through Nitro's request error handling. Do not attach an inline `.catch()` unless this route intentionally needs handling that differs from the app's normal error boundary.

Use project-owned helpers for env access. Do not expose the private token to client plugins.

## Server Plugin Injection

Create `plugins/storefront.server.ts`:

```ts
export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  if (!event?.context.storefrontClient) {
    throw new Error("Storefront client was not created for this server request.");
  }

  return {
    provide: {
      storefrontClient: event.context.storefrontClient,
      shopifyRequestContext: event.context.shopifyRequestContext,
    },
  };
});
```

Augment Nuxt and H3 types so `$storefrontClient` and `event.context.storefrontClient` are typed.

## Response Headers

Create `server/plugins/shopify-headers.ts`:

```ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event) => {
    const requestContext = event.context.shopifyRequestContext;
    if (!requestContext) return;

    const response = event.node.res;
    const headers = createHeaders(response.getHeaders());

    requestContext.applyResponseHeaders(headers);
    syncHeaders(response, headers);
  });
});

type ResponseHeaders = Record<string, number | string | string[] | undefined>;

function createHeaders(source: ResponseHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value != null) {
      headers.set(name, String(value));
    }
  }
  return headers;
}

function syncHeaders(
  response: {
    getHeaders(): ResponseHeaders;
    removeHeader(name: string): void;
    setHeader(name: string, value: number | string | readonly string[]): unknown;
  },
  headers: Headers,
) {
  for (const name of Object.keys(response.getHeaders())) {
    if (!headers.has(name)) response.removeHeader(name);
  }
  for (const [name, value] of headers) {
    if (name !== "set-cookie") response.setHeader(name, value);
  }

  const setCookies = headers.getSetCookie();
  if (setCookies.length > 0) response.setHeader("set-cookie", setCookies);
  else response.removeHeader("set-cookie");
}
```

Start with all existing response headers and synchronize both updates and removals after `applyResponseHeaders()`. This preserves multiple `set-cookie` values, applies private cache headers to personalized responses, and removes conflicting CDN cache directives.

## 404 Redirects

In `error.vue`, call `handleShopifyRedirects` only for server-side 404s:

```vue
<script setup lang="ts">
import { handleShopifyRedirects } from "@shopify/hydrogen";
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

if (import.meta.server && props.error.statusCode === 404) {
  const event = useRequestEvent();
  if (event) {
    const request = toWebRequest(event);
    const storefrontClient = event.context.storefrontClient;
    if (!storefrontClient) throw new Error("Storefront client was not created.");
    const redirect = await handleShopifyRedirects({ request, routeTemplates, storefrontClient });
    if (redirect) {
      const location = redirect.headers.get("location");
      if (location) await navigateTo(location, { redirectCode: redirect.status as 301 | 302 });
    }
  }
}
</script>
```

## Client Storefront Plugin

For client-side refetches, use a public client whose `fetch` rewrites Storefront API URLs to the same-origin Hydrogen SFAPI proxy:

```ts
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public;
  const requestContext = createShopifyRequestContext({
    request: { headers: new Headers() },
    i18n: { country: "US", language: "EN" },
  });
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: config.storeDomain,
      publicStorefrontToken: config.storefrontApiToken,
      fetch: (input, init) => {
        const requestUrl = new URL(
          typeof input === "string" ? input : input instanceof Request ? input.url : String(input),
        );
        const proxyUrl = new URL(requestUrl.pathname + requestUrl.search, window.location.origin);
        return fetch(proxyUrl, init);
      },
    },
  });

  return { provide: { storefrontClient } };
});
```

`storeDomain` and `storefrontApiToken` are example public runtime-config keys. Use the names already established by the app, and never expose the private Storefront token through `runtimeConfig.public`.

## Gotchas

- Do not call `handleShopifyRedirects` from middleware; Nuxt has not routed yet.
- Do not let browser fetches call the remote Storefront domain directly when the same-origin proxy is installed.
- Client plugins may read Nuxt public runtime config, but must not read `process.env` or private tokens.
- If `Set-Cookie` from Storefront API is missing, check the Nitro `beforeResponse` plugin first.
