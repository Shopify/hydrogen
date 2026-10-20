---
"@shopify/hydrogen": patch
---

The `hydrogen-setup` account-page step and the `hydrogen-smoke-test` account checks now point at the `hydrogen-local-https` skill when a real login needs a registered HTTPS origin. Because agent shells usually run with `CI` set and no TTY, they tell agents to ask the user to run `npx hydrogen certs install` (or `dev:https`) in a real terminal, and otherwise fall back to the signed-out checks and say so.
