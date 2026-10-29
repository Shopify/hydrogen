---
"@shopify/hydrogen": minor
---

Add `withStorefrontRateLimit`. Wrap a React Router loader or action with it to return HTTP `429` instead of `500` when the Storefront API rate limits the request. The `429` response has a fixed body, `Cache-Control: no-store`, and the Storefront API's `Retry-After` value when the value is valid. Other errors pass through unchanged. React Router doesn't report thrown responses to `handleError`, so the wrapper logs the original `StorefrontApiError` at `error` level through Hydrogen's logger. Loaders that you don't wrap still return `500`.

`requestContext.applyResponseHeaders()` accepts the response status as an optional second argument. React Router drops the headers of a thrown response, so pass `response.status` from your root middleware. When the status is `429` and the Storefront API rate limited a request that used the request context, the method sets `Cache-Control: no-store`, removes `Surrogate-Control` and vendor `*-Cache-Control` headers, and adds the valid `Retry-After` value when the response has none. Without the status, and for other statuses, the method works as before.
