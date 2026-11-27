---
"@shopify/hydrogen": patch
---

The Shop Pay button reads the `--shop-pay-button-border-radius` and `--shop-pay-button-height` CSS custom properties again, as the shop-js button did before 2026.10, so themes can match the button to their other buttons. Without the properties, the button keeps its `12px` radius and its current height. The `borderRadius` option still takes precedence over `--shop-pay-button-border-radius`.
