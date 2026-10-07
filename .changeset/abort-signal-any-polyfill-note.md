---
"@shopify/hydrogen": patch
---

Note in the `hydrogen-storefront-client` skill that runtimes without `AbortSignal.any`, such as Safari before 17.4 or the Next.js edge sandbox, need a polyfill loaded before Hydrogen is imported.
