---
'@shopify/hydrogen': patch
---

Fix browser extension compatibility issue causing "Cannot redefine property: Shopify" error

Added defensive checks in ShopifyCustomerPrivacy component to handle cases where browser extensions define window.Shopify as non-configurable. The component now detects existing property descriptors and uses polling fallback when property redefinition is not possible, ensuring Hydrogen apps work correctly with extensions.
