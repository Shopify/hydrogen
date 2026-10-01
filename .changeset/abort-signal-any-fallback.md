---
"@shopify/hydrogen": patch
---

The Storefront client, Customer Account client and cart no longer throw in runtimes without `AbortSignal.any`, such as Next.js's local edge runtime and Safari before 17.4. Hydrogen combines the signals itself there and removes its listeners when each operation finishes.
