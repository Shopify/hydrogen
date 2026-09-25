---
"@shopify/hydrogen": patch
---

Correct skill guidance on `StorefrontApiError` (GraphQL error codes are read from `result.errors`, not the thrown error) and on analytics `customData` (only cart events include it in payloads).
