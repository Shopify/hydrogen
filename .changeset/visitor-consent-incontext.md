---
'@shopify/hydrogen': minor
'@shopify/hydrogen-react': minor
---

Add `visitorConsent` support to `@inContext` directive for Storefront API parity

**Note: Most Hydrogen storefronts do NOT need this feature.**

This API addition provides Storefront API 2025-10 parity for the `visitorConsent` parameter in `@inContext` directives. However, if you're using Hydrogen's analytics provider or Shopify's Customer Privacy API (including third-party consent services integrated with it), consent is already handled automatically and you don't need to use this.

This feature is primarily intended for Checkout Kit and other non-Hydrogen integrations that manage consent outside of Shopify's standard consent flow.

**What it does:**
When explicitly provided, `visitorConsent` encodes buyer consent preferences (analytics, marketing, preferences, saleOfData) into the cart's `checkoutUrl` via the `_cs` parameter.
