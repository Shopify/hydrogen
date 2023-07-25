---
'@shopify/hydrogen': patch
---

`createWithCache` is now stable. All imports need to be updated:

```diff
- import {createWithCache_unstable} from '@shopify/hydrogen';
+ import {createWithCache} from '@shopify/hydrogen';
```
