---
'third-party-queries-caching': patch
'optimistic-cart-ui': patch
'subscriptions': patch
'customer-api': patch
'multipass': patch
'skeleton': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

👩‍💻 improved HydrogenSession typing.

In order to ensure utilies from @shopify/hydrogen will work properly using user implemented HydrogenSession class. We encourage the use of `HydrogenSession` type to ensure all the interface needed had been implemented.

Update implementation of HydrogenSession using type

```diff
import {
+ type HydrogenSession as DefaultHydrogenSession,
} from '@shopify/hydrogen';
- class HydrogenSession {
+ class HydrogenSession implements DefaultHydrogenSession {
    ...
}
```
