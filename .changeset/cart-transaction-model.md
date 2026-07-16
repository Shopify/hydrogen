---
"@shopify/hydrogen": patch
---

Replace cart optimistic update internals with keyed transaction and error projections, including reliable cancellation, request settlement, pending state updates, accurate partial-connection quantities, and coalesced authoritative reconciliation after overlapping mutations. Add `CartState.revalidating` and `CartState.pending.cost` so totals and analytics remain unconfirmed while cost-affecting mutations settle.
