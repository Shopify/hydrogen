---
"@shopify/hydrogen": minor
---

Add `createPublicRequest()` to restore the buyer-facing `request.url` behind a TLS-terminating proxy, such as the `localHttps` dev plugin or a tunnel. Call it at the server entry, before handing the request to your framework. React Router 7.18.3+ and 8.3.1+ reject a mutation whose `Origin` header does not match the `request.url` origin, and they run that check before route middleware. Without this call, cart and form submissions under `dev:https` fail with a bare `400 Bad Request`. Hydrogen redirects and Customer Account OAuth URLs also use the public origin once the request is normalized.

```ts
import { createPublicRequest } from "@shopify/hydrogen";

export default {
  async fetch(incomingRequest: Request, env: Env, executionContext: ExecutionContext) {
    const request = createPublicRequest(incomingRequest, {
      trustForwardedHeaders: import.meta.env.DEV,
    });
    // Pass `request` to the framework handler.
  },
};
```

`trustForwardedHeaders` is required: clients can send `x-forwarded-host` and `x-forwarded-proto` themselves, so only enable it when a proxy you control overwrites them. Oxygen already passes the public URL. In development builds, Hydrogen warns when a mutation's `Origin` still does not match the normalized `request.url`.
