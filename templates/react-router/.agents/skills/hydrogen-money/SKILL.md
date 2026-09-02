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

// `locale` should come from the resolved market. Default only in
// single-market storefronts; market-aware stores must pass the active locale.
export function formatPrice(money: MoneyV2, locale = "en-US"): string {
  return formatMoney(money, { locale }).toString();
}
```

## Rules

- Display server-provided money fields: `variant.price`, `variant.compareAtPrice`, `product.priceRange.minVariantPrice`, `line.cost.totalAmount`, `cart.cost.subtotalAmount`, etc.
- Do not multiply quantity by unit price in the browser. Cart totals are affected by discounts, duties, tax, rounding, and selling plans.
- Use the active market locale when the app has markets. Do not hardcode `en-US` in market-aware storefronts.
- Prefer a small app wrapper such as `formatPrice()` so locale and display options are consistent.
- Use `withoutTrailingZeros` only for presentation choices, never by editing amount strings manually.
- For price ranges, pass a readonly array of `MoneyV2` values to `formatMoney([...])`.

## Structured Output

`formatMoney()` returns an object that stringifies to the localized price. Use
`toString()` or template literals for normal UI. Call `formatMoney()` directly
or add an object-returning wrapper when the design needs split markup:

- `localizedString` - full display string, same as `toString()`.
- `amount` - localized numeric portion without currency.
- `numericAmount` - parsed number; do not use for cart totals or currency math.
- `currencySymbol`, `currencyNarrowSymbol`, `currencyName` - currency display variants.
- `parts` - `Intl.NumberFormatPart[]` for custom markup.
- `withoutTrailingZeros`, `withoutTrailingZerosAndCurrency` - presentation-only variants.

For ranges, `formatMoney([min, max], options)` returns an object that stringifies
to the localized range and exposes `min`, `max`, and `currencyCode`. Range
inputs must share one currency.

## Examples

```tsx
<p>{formatPrice(selectedVariant?.price ?? product.priceRange.minVariantPrice, locale)}</p>
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
