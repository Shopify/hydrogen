---
"@shopify/hydrogen": patch
---

Fix "Cannot redefine property: Shopify" crash caused by browser extensions (e.g. Urban VPN) that define `window.Shopify` as non-configurable. The customer privacy monitoring now wraps `Object.defineProperty` in a try/catch and falls back to polling when the property cannot be redefined, preventing complete app failure for affected users.