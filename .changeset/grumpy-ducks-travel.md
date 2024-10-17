---
'skeleton': patch
'@shopify/hydrogen': patch
---

Add a new route available on all hydrogen sites that proxies GraphQL requests to Shopify.
For example, `https://hydrogen.shop/api/2024-07/graphql` proxies to `https://hydrogen-preview.myshopify.com/api/2024-07/graphql`.
This allows the browser to make SFAPI requests on the same domain.

Note, your `server.ts` needs to be updated to return a caught response:

```diff
try {
 ...
} catch (error) {
  if (!(error instanceof Response)) {
    console.error(error);
  }
-  return new Response('An unexpected error occurred', {status: 500});
+  return error instanceof Response ? error : new Response('An unexpected error occurred', {status: 500});
}

```
