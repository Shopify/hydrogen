---
'@shopify/hydrogen': patch
---

Fix Hydrogen's Storefront API client to not throw unhandled promise exceptions. This is because Remix is guaranteed to handle exceptions from the loader and fixing it prevents Hydrogen from crashing when deployed to some runtimes on unhandled promise exceptions.
