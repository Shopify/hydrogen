# Core Helpers

Use core helpers when not using the React or Vue bindings:

```ts
import {
  createShopPayButton,
  renderShopPayButton,
} from "@shopify/hydrogen";
```

Both helpers create a self-contained `<hydrogen-shop-pay-button>` with an open
shadow root containing the protected styles and an anchor with the Shop Pay
logo. Pick by integration shape:

- `renderShopPayButton(options)` returns an HTML string. Use it in server
  templates or frameworks with raw-HTML rendering (`{@html}`, `v-html`,
  `innerHTML`). Server output includes a declarative shadow root and needs no
  client JavaScript. Browser calls register the custom element and return an
  empty host that creates its shadow root when connected; use
  `createShopPayButton` instead for client-created strict-CSP buttons that need
  a `nonce`.
- `createShopPayButton(options)` returns a detached self-contained
  `<hydrogen-shop-pay-button>` with an imperative shadow root. Use it for
  imperative DOM UIs.

For product buy buttons, pass variants:

```ts
const button = createShopPayButton({
  variants: [{ id: selectedVariant.id, quantity: 1 }],
  width: "100%",
});
container.append(button);
```

The open shadow root can be inspected with browser developer tools, but page CSS
cannot select its internal anchor or logo. The supported style controls are
`width` and `borderRadius`; do not treat the open root as a styling API.
Pass `nonce` when the storefront's Content Security Policy requires nonces for
inline `<style>` elements. The nonce does not authorize the `style` attribute
used by `width` and `borderRadius`; strict policies must allow inline style
attributes for those custom dimensions.

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
- `accessibilityLabel` sets the accessible name for the logo-only button, which otherwise defaults to English. Localize words around the brand, but never translate `Shop Pay` itself.
- `channel` is optional. Set it to `headless` or `hydrogen` only when checkout needs explicit attribution to the sales channel that issued the Storefront API token.
- `nonce` is optional. It is applied to the shadow root's `<style>` element for strict Content Security Policies in server output, `createShopPayButton`, and framework bindings.
- Pass `checkoutUrl` when the app does not route same-origin checkout paths through `handleShopifyRoutes`.
