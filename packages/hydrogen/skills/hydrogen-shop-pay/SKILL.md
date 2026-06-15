---
name: hydrogen-shop-pay
description: >
  Guide for adding or reviewing Shop Pay buttons in Hydrogen storefronts. Use
  when working with ShopPayButton, createShopPayButton, shop-pay-button custom
  elements, product buy buttons, cart checkout acceleration, variant IDs,
  quantities, channel/source attributes, or Shop Pay script loading.
---

# Shop Pay

Hydrogen provides framework bindings for Shop Pay plus lower-level helpers for non-framework UI.

Use:

- React: `references/react.md`.
- Vue or Nuxt: `references/vue.md`.
- Framework-neutral/custom elements: `references/core.md`.

## Rules

- Render Shop Pay only when there is a resolved ProductVariant ID.
- Pass ProductVariant GIDs or bare numeric ProductVariant IDs. Product IDs are invalid.
- Use quantity objects when quantity is known: `{ id: selectedVariant.id, quantity }`.
- Disable Shop Pay whenever the add-to-cart button is disabled or a product/cart mutation is pending.
- Use `channel="headless"` for Hydrogen headless storefronts unless the app has a reason to use a different channel.
- Do not hardcode checkout domains in React/Vue bindings; they derive checkout URL from `window.location.origin`.
- Keep Shop Pay near the primary purchase action, and keep its disabled state aligned with `canAddToCart(...)`.

## Product Page Pattern

```tsx
{selectedVariant ? (
  <ShopPayButton
    variants={[{ id: selectedVariant.id, quantity }]}
    channel="headless"
    disabled={!addable || pending}
    width="100%"
    height="48px"
    borderRadius="9999px"
  />
) : null}
```

`addable` should come from `canAddToCart(product, options)`, not from checking `selectedVariant` alone.

## Cart Pattern

For a full-cart checkout shortcut, pass all cart lines with merchandise IDs and quantities. Hide or disable Shop Pay if any line cannot be purchased.

## Gotchas

- The custom element is loaded from Shopify's Shop JS module. Framework bindings load it on mount by default.
- In development, Hydrogen's bindings intercept clicks to support localhost checkout behavior.
- If the button renders but does nothing, verify variant ID format and disabled state first.
