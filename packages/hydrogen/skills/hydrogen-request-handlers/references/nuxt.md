# Nuxt And Nitro

Nuxt needs three pieces:

1. Nitro middleware for `handleShopifyRoutes` and request-scoped client creation.
2. A server plugin that applies captured Storefront response headers before Nitro responds.
3. `error.vue` handling for post-routing Shopify redirects on 404.

## Server Middleware

Create `server/middleware/shopify.ts`:

Resolve `buyerIp` from the app's trusted deployment headers before creating the private client. Use the buyer-IP guidance from `hydrogen-storefront-client`.

```ts
import {
  createCartServerHandlers,
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRoutes,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";

const cartHandlers = createCartServerHandlers();

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createPrivateStorefrontClient(request, requestContext);

  const shopifyRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return sendWebResponse(event, shopifyRoute);

  event.context.storefrontRequestContext = requestContext;
  event.context.storefrontClient = storefrontClient;
});

function createPrivateStorefrontClient(request: Request, requestContext: StorefrontRequestContext) {
  const buyerIp = getBuyerIp(request.headers);
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp,
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });
}
```

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
      storefrontRequestContext: event.context.storefrontRequestContext,
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
    const requestContext = event.context.storefrontRequestContext;
    if (!requestContext) return;

    const headers = new Headers();
    copyHeader(event.node.res.getHeader("content-type"), (value) => {
      headers.set("content-type", value);
    });
    copyHeader(event.node.res.getHeader("server-timing"), (value) => {
      headers.append("server-timing", value);
    });

    requestContext.applyResponseHeaders(headers);

    const serverTiming = headers.get("server-timing");
    if (serverTiming) event.node.res.setHeader("server-timing", serverTiming);

    const setCookies = headers.getSetCookie();
    if (setCookies.length > 0) {
      event.node.res.setHeader("set-cookie", [
        ...normalizeSetCookie(event.node.res.getHeader("set-cookie")),
        ...setCookies,
      ]);
    }
  });
});

function copyHeader(value: number | string | string[] | undefined, copy: (value: string) => void) {
  if (Array.isArray(value)) {
    for (const item of value) copy(item);
  } else if (value != null) {
    copy(String(value));
  }
}

function normalizeSetCookie(value: number | string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}
```

Preserve existing `set-cookie` values when appending Storefront cookies.

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
    const redirect = await handleShopifyRedirects({ request, storefrontClient });
    const location = redirect?.headers.get("location");
    if (location) await navigateTo(location, { redirectCode: redirect!.status as 301 | 302 });
  }
}
</script>
```

## Client Storefront Plugin

For client-side refetches, use a public client whose `fetch` rewrites Storefront API URLs to the same-origin Hydrogen SFAPI proxy:

```ts
import { createStorefrontClient } from "@shopify/hydrogen";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public;
  const storefrontClient = createStorefrontClient({
    type: "public",
    config: {
      storeDomain: config.storeDomain,
      publicStorefrontToken: config.storefrontApiToken,
      i18n: { country: "US", language: "EN" },
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
