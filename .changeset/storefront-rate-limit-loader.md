---
"@shopify/hydrogen": minor
---

Add `withStorefrontRateLimit`. Wrap a React Router loader or action with it to return HTTP `429` instead of `500` when the Storefront API rate limits the request. The `429` response has a fixed body, `Cache-Control: no-store`, and the Storefront API's `Retry-After` value when the value is valid. Other errors pass through unchanged. React Router doesn't report thrown responses to `handleError`, so the wrapper logs the original `StorefrontApiError` at `error` level through Hydrogen's logger. Loaders that you don't wrap still return `500`.

`requestContext.applyResponseHeaders()` accepts the response status as an optional second argument. React Router drops the headers of a thrown response, so pass `response.status` from your root middleware, and call the method on the request context of the Storefront API client that your loaders use. For a `429` after a Storefront API rate limit, the method then restores `Cache-Control: no-store` and `Retry-After`; see the method's documentation for the exact rules. If you omit the status after a rate limit, the method logs one warning. Without a rate limit, and for other statuses, the method works as before.
