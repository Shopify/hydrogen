# Core Helpers

Use core helpers when not using React or Vue bindings:

```ts
import {
  createShopPayButton,
  getShopPayButtonAttributes,
  loadShopJs,
} from "@shopify/hydrogen";
```

Load Shop JS before relying on the custom element:

```ts
await loadShopJs();
const button = createShopPayButton({
  checkoutUrl: window.location.origin,
  variants: [{ id: selectedVariant.id, quantity: 1 }],
  channel: "headless",
  width: "100%",
});
container.append(button);
```

For server-rendered markup, render the custom element attributes from `getShopPayButtonAttributes(...)` and load Shop JS on the client.

## Validation Rules

- Variant IDs must be Shopify ProductVariant GIDs or bare numeric variant IDs.
- Quantities must be positive integers.
- Mixed variant formats are invalid: use all strings or all `{ id, quantity }` objects.
- `disabled` suppresses checkout URL generation.
