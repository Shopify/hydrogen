---
'@shopify/hydrogen': patch
'@shopify/hydrogen-react': patch
---

Fix cart operations failing on stores without `VisitorConsent` type

Cart operations (like `cart.setMetafields()`) were unconditionally including the `visitorConsent` parameter in GraphQL operations, even when not being used. This caused failures on stores whose Storefront API schema doesn't include the `VisitorConsent` type (older API versions or certain store configurations).

The `visitorConsent` parameter is now only included in cart GraphQL operations when explicitly provided. This restores compatibility with stores that don't support the `VisitorConsent` type while preserving the feature for users who need it.
