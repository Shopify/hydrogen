# Nuxt

Nuxt needs separate server and client Storefront clients:

- Server requests use a request-scoped private client created in Nitro middleware.
- Browser refetches use a public client whose `fetch` routes through the same-origin Hydrogen SFAPI proxy.

Read the `hydrogen-request-handlers` Nuxt reference when wiring middleware, response-header propagation, and 404 redirects.

## Server Client

Create the private client in server middleware where Nuxt exposes the incoming request:

```ts
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";

export default defineEventHandler((event) => {
  const request = toWebRequest(event);
  const requestContext = createStorefrontRequestContext(request);

  event.context.storefrontClient = createPrivateStorefrontClient(request, requestContext);
  event.context.storefrontRequestContext = requestContext;
});

function createPrivateStorefrontClient(request: Request, requestContext: StorefrontRequestContext) {
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp: getBuyerIp(request.headers),
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });
}
```

Use a project helper for `getBuyerIp`. Do not infer buyer IP from untrusted headers unless the deployment's proxy chain is known.

## Server Injection

Expose the middleware-created client through a server plugin:

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

Augment `#app`, `h3`, and `vue` types so `$storefrontClient` is available in pages and composables.

## Client Plugin

Browser-side Storefront API calls should go through the same-origin SFAPI proxy installed by `handleShopifyRoutes`. Do not call the remote store domain directly from the browser.

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

## Query Usage

In server pages, prefer the injected private client:

```ts
const { $storefrontClient } = useNuxtApp();
const { data } = await $storefrontClient.graphql(PRODUCT_QUERY, {
  variables: { handle },
});
```

In client navigations or `useAsyncData` refreshes that run in the browser, the injected public client uses the proxy fetch above.

## Gotchas

- Keep private token access in server-only files.
- In client plugins, read only Nuxt public runtime config values that were intentionally exposed; never read `process.env` or private tokens.
- Apply `requestContext` response headers in a Nitro `beforeResponse` plugin; otherwise Storefront cookies can be lost.
- Route query objects can mishandle dotted filter keys. For collection/search browsing, use Hydrogen's serialized search strings instead.
