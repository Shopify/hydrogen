---
"@shopify/hydrogen": patch
---

**Breaking:** Remove the unused `EventPayloads` type export. To type a payload for any supported analytics event, use `AnalyticsEventMap[AnalyticsEventName]`. For a single event, use `PayloadFor<"product_viewed">`.
