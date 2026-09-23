---
"@shopify/hydrogen": patch
---

**Breaking:** Remove the standalone `CartProvider`, `useCart`, `useCartActions`, and `useCartForm` exports from `@shopify/hydrogen/react`. They dropped custom `CartFragment` types. Use the typed versions from `createCartComponents()` instead:

```ts
import { createCartComponents } from "@shopify/hydrogen/react";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartActions, useCartForm } =
  createCartComponents<typeof cartHandlers>();
```

`useCartAnalytics` is still exported.
