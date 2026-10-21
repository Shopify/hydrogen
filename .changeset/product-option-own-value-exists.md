---
"@shopify/hydrogen": patch
---

Product option values now resolve `exists` and `available` from `encodedVariantExistence` and `encodedVariantAvailability` even when no loaded variant carries the value. Before, a value with no `firstSelectableVariant`, or any value on a query that omitted `firstSelectableVariant` and `adjacentVariants`, was reported as existing and in stock whenever the other selected options matched a variant.
