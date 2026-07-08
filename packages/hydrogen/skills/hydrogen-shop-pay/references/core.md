# Core Helpers

Use core helpers when not using React bindings:

```ts
import {
  createShopPayButton,
  getShopPayButtonAttributes,
  loadShopJs,
} from "@shopify/hydrogen";
```

Load Shop JS before relying on the custom element.

For product buy buttons, pass variants:

```ts
await loadShopJs();
const button = createShopPayButton({
  variants: [{ id: selectedVariant.id, quantity: 1 }],
  channel: "hydrogen",
  width: "100%",
});
container.append(button);
```

For cart checkout buttons, pass the checkout URL from cart state and omit variants:

```ts
await loadShopJs();
const button = createShopPayButton({
  checkoutUrl: cart.checkoutUrl,
  channel: "hydrogen",
  width: "100%",
});
container.append(button);
```

For server-rendered markup, render the custom element attributes from `getShopPayButtonAttributes(...)` and load Shop JS on the client.

When wiring core helpers directly, put the custom element in a wrapper that reserves vertical space while Shop JS hydrates. This prevents layout shift when the button loads. The logo button currently renders at roughly 42px tall, but treat that as an estimate rather than a stable API. If you need a richer loading state, render a skeleton in the wrapper until the custom element is ready.

## Validation Rules

- Variant IDs must be Shopify ProductVariant GIDs or bare numeric variant IDs.
- Quantities must be positive integers.
- Mixed variant formats are invalid: use all strings or all `{ id, quantity }` objects.
- Cart checkout mode omits `variants` and uses the current cart's `checkoutUrl`.
- `disabled` suppresses checkout URL generation.
