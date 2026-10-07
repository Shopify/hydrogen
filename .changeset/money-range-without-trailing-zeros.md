---
"@shopify/hydrogen": patch
---

Fix `formatMoney([min, max], { withoutTrailingZeros: true })` rounding the maximum when only the minimum is a whole number, so `$10.00` to `$19.99` renders as `$10.00 – $19.99` instead of `$10 – $20`. Whole-number detection now looks only at the rendered minimum and maximum, so values in between no longer affect the output.
