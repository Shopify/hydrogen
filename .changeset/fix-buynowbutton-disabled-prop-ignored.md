---
'@shopify/hydrogen-react': patch
'@shopify/hydrogen': patch
---

Fixed BuyNowButton to respect the consumer's `disabled` prop when not in a loading state. Previously, the nullish coalescing operator (`??`) prevented the fallback from ever being evaluated since `loading` is always a boolean.
