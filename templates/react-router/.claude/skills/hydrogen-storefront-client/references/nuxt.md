# Nuxt

Nuxt needs separate server and client Storefront clients:

- Server requests use a request-scoped public client created in Nitro middleware.
- Browser refetches use a public client whose `fetch` routes through the same-origin Hydrogen SFAPI proxy.

Use the `hydrogen-request-handlers` skill when wiring middleware, response-header propagation, and 404 redirects.

## Server Client

Create the client in server middleware where Nuxt exposes the incoming request. `PUBLIC_STOREFRONT_API_TOKEN` may be unset, which means tokenless access (all mock.shop supports). Once the app has a private token and trusted buyer context, switch to `type: "private"` and resolve `buyerIp` per the `hydrogen-storefront-client` buyer-IP guidance:

```ts
import {
  createStorefrontClient,
  createShopifyRequestContext,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";

export default defineEventHandler((event) => {
  const request = toWebRequest(event);
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  event.context.storefrontClient = createPublicStorefrontClient(requestContext);
  event.context.shopifyRequestContext = requestContext;
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

When upgrading to a private client, use a project helper for `getBuyerIp`. Do not infer buyer IP from untrusted headers unless the deployment's proxy chain is known.

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
      shopifyRequestContext: event.context.shopifyRequestContext,
    },
  };
});
```

Augment `#app`, `h3`, and `vue` types so `$storefrontClient` is available in pages and composables.

## Client Plugin

Browser-side Storefront API calls should go through the same-origin SFAPI proxy installed by `handleShopifyRoutes`. Do not call the remote store domain directly from the browser.

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

## Query Usage

In server pages, prefer the injected server client:

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
