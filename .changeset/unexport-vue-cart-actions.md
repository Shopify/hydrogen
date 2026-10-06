---
"@shopify/hydrogen": patch
---

**Breaking:** Remove the standalone `useCartActions` export from `@shopify/hydrogen/vue`. It was the last cart composable still exported directly after `@shopify/hydrogen/react` dropped its standalone cart hooks, and like them it carried no custom `CartFragment` types. Use the typed version from `createCartComponents()` instead:

```ts
import { createCartComponents } from "@shopify/hydrogen/vue";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartActions, useCartForm } =
  createCartComponents<typeof cartHandlers>();
```

`useCartAnalytics` is still exported.
