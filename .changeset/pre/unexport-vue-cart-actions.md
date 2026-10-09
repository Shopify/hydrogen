---
"@shopify/hydrogen": patch
---

**Breaking:** Remove the standalone `useCartActions` export from `@shopify/hydrogen/vue`, matching the React entry after #4056. It dropped custom `CartFragment` types. Use the typed version from `createCartComponents()` instead:

```ts
import { createCartComponents } from "@shopify/hydrogen/vue";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartActions, useCartForm } =
  createCartComponents<typeof cartHandlers>();
```

`useCartAnalytics` is still exported.
