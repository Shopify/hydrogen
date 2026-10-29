---
'@shopify/hydrogen': patch
---

`useCustomerPrivacy` no longer crashes the page when a browser extension or another script has frozen `window.Shopify`. It now logs a warning and skips loading the Customer Privacy API instead of throwing `TypeError: Cannot add property customerPrivacy, object is not extensible`.
