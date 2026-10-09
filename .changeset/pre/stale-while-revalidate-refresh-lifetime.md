---
"@shopify/hydrogen": minor
---

Storefront API stale-while-revalidate refreshes are no longer cancelled when the request or caller aborts, and are bounded by `defaultTimeoutInMs` instead (30 seconds when it is `0`). Custom `createFetchWithCache` runners can call `run({ background: true })` to use the new `backgroundSignal` cache option, and runners that call `run()` keep working.

The `hydrogen-storefront-client` and `hydrogen-customer-account` skills now note that the Next.js edge sandbox lacks `AbortSignal.any`, so edge routes and middleware that call those clients need a polyfill. The `hydrogen-cart-ui` skill notes that Safari 16.0 through 17.3 lacks it too, so the browser cart store needs the polyfill there.
