---
name: hydrogen-money
description: >
  Guide for formatting Shopify money values in Hydrogen storefronts. Use when
  rendering product prices, compare-at prices, cart totals, collection price
  ranges, Shop Pay prices, or any MoneyV2 amount/currencyCode values.
---

# Money Formatting

Use Hydrogen's `formatMoney()` for Storefront API `MoneyV2` values. Never build money strings by concatenating currency symbols or computing totals client-side.

```ts
import { formatMoney, type MoneyV2 } from "@shopify/hydrogen";

export function formatPrice(money: MoneyV2): string {
  return formatMoney(money, { locale: "en-US" }).toString();
}
```

## Rules

- Display server-provided money fields: `variant.price`, `variant.compareAtPrice`, `product.priceRange.minVariantPrice`, `line.cost.totalAmount`, `cart.cost.subtotalAmount`, etc.
- Do not multiply quantity by unit price in the browser. Cart totals are affected by discounts, duties, tax, rounding, and selling plans.
- Use the active market locale when the app has markets. Do not hardcode `en-US` in market-aware storefronts.
- Prefer a small app wrapper such as `formatPrice()` so locale and display options are consistent.
- Use `withoutTrailingZeros` only for presentation choices, never by editing amount strings manually.
- For price ranges, pass a readonly array of `MoneyV2` values to `formatMoney([...])`.

## Examples

```tsx
<p>{formatPrice(selectedVariant?.price ?? product.priceRange.minVariantPrice)}</p>
```

```ts
const range = formatMoney(
  [product.priceRange.minVariantPrice, product.priceRange.maxVariantPrice],
  { locale, withoutTrailingZeros: true },
).toString();
```

## Anti-Patterns

- `"$" + amount`
- `Number(amount).toFixed(2)`
- `line.quantity * Number(line.merchandise.price.amount)`
- Showing cart totals at full opacity while a related cart mutation is pending.
