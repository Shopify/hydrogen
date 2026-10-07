---
"@shopify/hydrogen": minor
---

Storefront API stale-while-revalidate refreshes are no longer cancelled when the request or caller aborts, and are bounded by `defaultTimeoutInMs` instead (30 seconds when it is `0`). Custom `createFetchWithCache` runners can call `run({ background: true })` to use the new `backgroundSignal` cache option, and runners that call `run()` keep working.

The `hydrogen-storefront-client` skill now notes that runtimes without `AbortSignal.any`, such as Safari before 17.4 or the Next.js edge sandbox, need a polyfill loaded before Hydrogen is imported.
