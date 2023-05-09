---
'@shopify/hydrogen-react': patch
'@shopify/hydrogen': patch
---

Adds `parseGid()` which is a helper function that takes in a [Shopify GID](https://shopify.dev/docs/api/usage/gids) and returns the `resource` and `id` from it. For example:

```js
import {parseGid} from '@shopify/hydrogen-react';

const {id, resource} = parseGid('gid://shopify/Order/123');

console.log(id); // 123
console.log(resource); // Order
```
