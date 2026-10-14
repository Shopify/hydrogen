---
"@shopify/hydrogen": minor
---

Add standard signifiers. `register("addToCart", {})` now also returns the `product-add-to-cart` signifier attributes (`data-shopify-testid`, `data-shopify-variant-id`, `data-shopify-available`) for the selected variant. Ordinary `data-testid` attributes stay separate. Use `signifier()` to mark custom elements and `signifierSelector()` to find them:

```ts
import { signifier, signifierSelector } from "@shopify/hydrogen";

const attributes = signifier("product-add-to-cart", { variantId, available: true });
document.querySelector(signifierSelector("product-add-to-cart", { variantId }));
```
