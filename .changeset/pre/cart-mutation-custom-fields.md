---
"@shopify/hydrogen": patch
---

A settled cart mutation now replaces every non-line field its response returns, including discount codes and fields a custom `CartFragment` selects, such as `appliedGiftCards` or `buyerIdentity`. Before, the store only took the id, checkout URL, totals and cost, so other fields stayed stale and a cart created by the first add had none of them until a refresh.
