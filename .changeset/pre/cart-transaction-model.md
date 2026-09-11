---
"@shopify/hydrogen": patch
---

Replace cart optimistic update internals with keyed transaction and error projections, including reliable cancellation, request settlement, pending state updates, accurate partial-connection quantities, and coalesced authoritative reconciliation after overlapping mutations. Add `CartState.revalidating`, `CartState.pending.cost`, and default cart line identity fields for selling plans and attributes so totals, analytics, and optimistic add reconciliation remain accurate while cost-affecting mutations settle.
