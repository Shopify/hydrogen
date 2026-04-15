---
"@shopify/mini-oxygen": patch
---

Fix intermittent "MiniOxygen couldn't load your app's entry point" errors during development by adding retry logic and recovery from Vite's dependency optimizer cache invalidation in the module fetch transport
