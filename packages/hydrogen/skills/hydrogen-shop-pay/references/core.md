# Core Helpers

Use core helpers when not using the React or Vue bindings:

```ts
import {
  createShopPayButton,
  defineShopPayButton,
  renderShopPayButton,
} from "@shopify/hydrogen";
```

All three render the same markup: a styled `<a>` with the Shop Pay logo, a
localized accessible label, and the button styles. Pick by integration shape:

- `renderShopPayButton(options)` returns an HTML string. Use it in server
  templates or frameworks with raw-HTML rendering (`{@html}`, `v-html`,
  `innerHTML`). The output needs no client JavaScript.
- `createShopPayButton(options)` returns a detached DOM element and injects the
  button styles into `document.head` once. Use it for imperative DOM UIs.
- `defineShopPayButton()` registers the `<shop-pay-button>` custom element for
  declarative HTML. Call it once in the client entry; it is browser-only, safe
  to call repeatedly, and skipped if the tag is already defined.

For product buy buttons, pass variants:

```ts
const button = createShopPayButton({
  variants: [{ id: selectedVariant.id, quantity: 1 }],
  channel: "hydrogen",
  width: "100%",
});
container.append(button);
```

Or declaratively, after `defineShopPayButton()`:

```html
<shop-pay-button variants="123:1" channel="hydrogen"></shop-pay-button>
```

The element re-renders when its attributes change. Size it by setting the CSS
custom properties on the element: `style="--shop-pay-button-width: 100%"`.

For cart checkout buttons, omit `variants`; the button links to the same-origin
`/checkout` path and `handleShopifyRoutes` redirects it to the current cart's
checkout:

```ts
const button = createShopPayButton({
  channel: "hydrogen",
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
- `locale` selects the accessible label language (defaults to English).
- `checkoutUrl` is only for rendering the button outside the storefront origin.
