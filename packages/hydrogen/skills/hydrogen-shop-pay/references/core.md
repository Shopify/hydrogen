# Core Helpers

Use core helpers when not using the React or Vue bindings:

```ts
import {
  createShopPayButton,
  renderShopPayButton,
} from "@shopify/hydrogen";
```

Both helpers render the same markup: a self-contained `<hydrogen-shop-pay-button>` element
with its own styles and an anchor containing the Shop Pay logo. Pick by
integration shape:

- `renderShopPayButton(options)` returns an HTML string. Use it in server
  templates or frameworks with raw-HTML rendering (`{@html}`, `v-html`,
  `innerHTML`). The output needs no client JavaScript. Each render carries the
  button styles so it works standalone; duplication across multiple buttons on a
  page is harmless.
- `createShopPayButton(options)` returns a detached self-contained
  `<hydrogen-shop-pay-button>` element. Use it for imperative DOM UIs.

For product buy buttons, pass variants:

```ts
const button = createShopPayButton({
  variants: [{ id: selectedVariant.id, quantity: 1 }],
  width: "100%",
});
container.append(button);
```

The element is not registered as a custom element. It is just a wrapper carrying
the styles and anchor HTML.

For cart checkout buttons, omit `variants`; the button links to the same-origin
`/checkout` path and `handleShopifyRoutes` redirects it to the current cart's
checkout:

```ts
const button = createShopPayButton({
  width: "100%",
});
container.append(button);
```

## Validation Rules

- Variant IDs must be Shopify ProductVariant GIDs or bare numeric variant IDs.
- Quantities must be positive integers.
- Mixed variant formats are invalid: use all strings or all `{ id, quantity }` objects.
- Cart checkout mode omits `variants`; the current cart checks out.
- `disabled` renders the button without an `href` and with `aria-disabled="true"`.
- `accessibilityLabel` sets the accessible name for logo-only buttons, which otherwise default to English. If `buttonText` is present and `accessibilityLabel` is omitted, the visible text names the button. Localize words around the brand, but never translate `Shop Pay` itself.
- `checkoutUrl` is only for rendering the button outside the storefront origin.
