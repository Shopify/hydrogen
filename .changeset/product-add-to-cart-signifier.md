---
"@shopify/hydrogen": minor
---

Add standard signifiers. `register("addToCart", {})` now also returns the `product-add-to-cart` signifier attributes (`data-h3`, `data-h3-variant-id`, `data-h3-available`) for the selected variant. Use `signifier()` to mark custom elements and `signifierSelector()` to find them:

```ts
import { signifier, signifierSelector } from "@shopify/hydrogen";

const attributes = signifier("product-add-to-cart", { variantId, available: true });
document.querySelector(signifierSelector("product-add-to-cart", { variantId }));
```
