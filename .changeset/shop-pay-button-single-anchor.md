---
"@shopify/hydrogen": patch
---

The Shop Pay button no longer renders two links when it streams in through a `<Suspense>` boundary. When Hydrogen's client code had already loaded, the button built its own shadow root before the browser read the server's markup, and then copied the server's markup in as well, so the button showed a duplicate link and style. The button now discards the server's markup when it already has a shadow root.
