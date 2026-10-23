---
"@shopify/hydrogen": patch
---

The `hydrogen-setup` account-page step and the `hydrogen-smoke-test` account checks now point at the `hydrogen-local-https` skill when a real login needs a registered HTTPS origin. Because agent shells usually run with `CI` set and no TTY, they tell agents to ask the user to run `dev:https` in a real terminal on Vite-based frameworks, which serves trusted HTTPS and registers the Customer Account URLs, and note that Next.js uses its own HTTPS command with manual URL configuration. They note that `npx hydrogen certs install` only provisions certificate files. If the user can't provide a registered HTTPS local origin, agents fall back to the signed-out checks and say so.
