---
'@shopify/hydrogen': patch
---

Make default `HydrogenSession` type extensible.

Update implementation of HydrogenSession using type:

```diff
import {
+ type HydrogenSession,
} from '@shopify/hydrogen';
- class HydrogenSession {
+ class AppSession implements HydrogenSession {
    ...
}
```
