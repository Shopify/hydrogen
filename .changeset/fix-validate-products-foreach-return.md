---
'@shopify/hydrogen': minor
---

Fixed `validateProducts` in the Shopify analytics manager to actually block invalid product payloads. Previously, `return false` inside a `forEach` callback only exited the iteration and the function always returned `true`, so analytics events were sent despite validation failures (with warnings logged). Products missing required fields (`id`, `title`, `price`, `vendor`, `variantId`, `variantTitle`) will now be blocked.
