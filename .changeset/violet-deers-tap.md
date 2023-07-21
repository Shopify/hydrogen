---
'@shopify/hydrogen': patch
---

`Pagination` and `getPaginationVariables` are now stable.

All imports to each should be updated:

```diff
- import {Pagiatinon__unstable, getPaginationVariables__unstable} from '@shopify/hydrogen';
+ import {Pagiatinon, getPaginationVariables} from '@shopify/hydrogen';
```
