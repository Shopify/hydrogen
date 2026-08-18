---
name: hydrogen-shop-pay
description: >
  Guide for adding or reviewing Shop Pay buttons in Hydrogen storefronts. Use
  when working with ShopPayButton, renderShopPayButton, createShopPayButton,
  product buy buttons, cart checkout acceleration, variant IDs, quantities, or
  source attribution attributes.
---

# Shop Pay

Hydrogen renders the Shop Pay button locally as a `<hydrogen-shop-pay-button>`
with a declarative shadow root. The shadow root protects the branded styles and
contains an anchor pointing at the storefront's own `/checkout` or
`/cart/<id>:<qty>` permalink paths, which `handleShopifyRoutes` redirects to the
store's real checkout. No external script loads and the server-rendered button
works before any JavaScript runs.

## Framework References

Before writing UI, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework binding. If there is no matching reference, use `references/core.md` and wire the framework-neutral helpers into the app's existing component and routing conventions.

## Rules

- For product buy buttons, render Shop Pay only when there is a resolved ProductVariant ID.
- Pass ProductVariant GIDs or bare numeric ProductVariant IDs. Product IDs are invalid.
- Use quantity objects when quantity is known: `{ id: selectedVariant.id, quantity }`.
- For cart checkout buttons, omit `variants`; checkout mode uses the current cart.
- Disable Shop Pay whenever the add-to-cart button is disabled or a product/cart mutation is pending.
- Omit `channel` unless the integration needs explicit `headless` or `hydrogen` checkout attribution and knows which sales channel issued its Storefront API token.
- Omit `checkoutUrl` when the app routes same-origin checkout paths through `handleShopifyRoutes`. Otherwise pass the cart checkout URL.
- Pass `nonce` only when the storefront's Content Security Policy requires nonces for inline `<style>` elements. The nonce authorizes the shadow-root stylesheet, not the `style` attribute used by `width` and `borderRadius`; strict policies must allow inline style attributes for those custom dimensions.
- Keep Shop Pay near the primary purchase action, and keep its disabled state aligned with `canAddToCart(...)`.
- Size with `width` and `borderRadius`; arbitrary `className` and `style` overrides are intentionally not supported because the branded button is isolated inside its shadow root. Pass `accessibilityLabel` when the storefront language is not English, and never translate the `Shop Pay` brand name.

## Product Page Pattern

```tsx
{selectedVariant ? (
  <ShopPayButton
    variants={[{ id: selectedVariant.id, quantity }]}
    disabled={!addable || pending}
    width="100%"
    borderRadius="9999px"
  />
) : null}
```

`addable` should come from `canAddToCart(product, options)`, not from checking `selectedVariant` alone.

## Cart Pattern

For a full-cart checkout shortcut, render Shop Pay without `variants` and hide or disable it when the cart is empty or a cart mutation is pending.

```tsx
{cart.lines.nodes.length > 0 ? (
  <ShopPayButton
    disabled={cartPending}
    width="100%"
    borderRadius="4px"
  />
) : null}
```

## Verify

Done when:

- [ ] Product buy buttons render Shop Pay only when a resolved ProductVariant ID exists.
- [ ] Shop Pay's disabled state matches the add-to-cart button (disabled when add-to-cart is disabled or a product/cart mutation is pending).
- [ ] Product buttons pass ProductVariant GIDs or bare numeric variant IDs (never Product IDs), with a quantity object when quantity is known.
- [ ] Cart checkout buttons omit `variants` and are hidden or disabled when the cart is empty or a mutation is pending.
- [ ] `checkoutUrl` is omitted only when `handleShopifyRoutes` handles the same-origin checkout paths.

## Gotchas

- The button's same-origin URLs only check out if the app routes requests through `handleShopifyRoutes`, which redirects `/checkout` and `/cart/<id>:<qty>` permalinks to the store's checkout.
- Disabled buttons render without an `href` (with `aria-disabled="true"`), so nothing navigates while a mutation is pending.
- If the button renders but checkout fails, verify variant ID format and that `handleShopifyRoutes` handles the request first.
